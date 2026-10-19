/**
 * Recordings answered in pieces ("range requests"). Cloudflare's static assets always send the
 * whole file, but Safari on iPhone asks for audio in pieces and may refuse to play a file sent
 * otherwise. The MP3s are small (about 2 MB in all, 50 KB at most), so the Worker reads the file
 * and sends the piece asked for (RFC 9110, section 14). Only for MP3s: wrangler.jsonc's
 * `run_worker_first` sends just them through the Worker. Custom code because the ready-made
 * route, the Workers Cache API (said to answer ranges from a cached file), does nothing on
 * workers.dev, so it couldn't be tested before the cutover.
 */

/** The byte range a `Range` header asks for: one range only, as browsers ask for media. */
export const parseRange = (header: string, size: number): { start: number; end: number } | null => {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, first = '', last = ''] = match;
  if (first === '' && last === '') return null;
  if (first === '') {
    // The last N bytes.
    const length = Math.min(Number(last), size);
    return length > 0 ? { start: size - length, end: size - 1 } : null;
  }
  const start = Number(first);
  const end = last === '' ? size - 1 : Math.min(Number(last), size - 1);
  return start <= end ? { start, end } : null;
};

/**
 * A GET or HEAD for a recording, answered from the whole file `full` as the assets sent it (a
 * 200, or a 304/404 passed on as it is).
 */
export const answerRange = async (request: Request, full: Response): Promise<Response> => {
  const header = request.headers.get('Range');
  const headers = new Headers(full.headers);
  headers.set('Accept-Ranges', 'bytes');
  // If-Range: the piece only if the file is still the one the browser has; else all of it.
  const ifRange = request.headers.get('If-Range');
  const current = !ifRange || ifRange === full.headers.get('ETag');
  if (!header || !current || full.status !== 200 || request.method !== 'GET') {
    return new Response(full.body, { status: full.status, headers });
  }
  const body = await full.arrayBuffer();
  const size = body.byteLength;
  // A header we don't understand (several ranges, other units) gets the whole file, as the
  // standard allows; a range wholly past the end gets 416.
  if (!/^bytes=\d*-\d*$/.test(header.trim())) return new Response(body, { status: 200, headers });
  const range = parseRange(header, size);
  if (!range) {
    headers.set('Content-Range', `bytes */${size}`);
    headers.delete('Content-Length');
    headers.delete('Content-Type');
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  headers.set('Content-Length', String(range.end - range.start + 1));
  return new Response(body.slice(range.start, range.end + 1), { status: 206, headers });
};

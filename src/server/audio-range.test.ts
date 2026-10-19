import { describe, expect, it } from 'vitest';
import { answerRange, parseRange } from './audio-range';

const FILE = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
const full = () =>
  new Response(FILE, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': '10',
      ETag: '"v1"',
      'X-Kept': 'yes',
    },
  });
const get = (range?: string, more: Record<string, string> = {}, method = 'GET') =>
  new Request('https://mikraot.net/wp-content/uploads/2021/09/a.mp3', {
    method,
    headers: { ...(range ? { Range: range } : {}), ...more },
  });
const bytes = async (response: Response) => [...new Uint8Array(await response.arrayBuffer())];

describe('parseRange', () => {
  it('reads a start and end, an open end, and a final length', () => {
    expect(parseRange('bytes=0-1', 10)).toEqual({ start: 0, end: 1 });
    expect(parseRange('bytes=4-', 10)).toEqual({ start: 4, end: 9 });
    expect(parseRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 });
  });

  it('clips an end past the file, and refuses a start past it', () => {
    expect(parseRange('bytes=8-100', 10)).toEqual({ start: 8, end: 9 });
    expect(parseRange('bytes=-100', 10)).toEqual({ start: 0, end: 9 });
    expect(parseRange('bytes=10-', 10)).toBeNull();
    expect(parseRange('bytes=5-2', 10)).toBeNull();
    expect(parseRange('bytes=-', 10)).toBeNull();
    expect(parseRange('bytes=-0', 10)).toBeNull();
  });
});

describe('answerRange', () => {
  it('sends the piece asked for (as Safari first asks for two bytes)', async () => {
    const response = await answerRange(get('bytes=0-1'), full());
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe('bytes 0-1/10');
    expect(response.headers.get('Content-Length')).toBe('2');
    expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    expect(response.headers.get('X-Kept')).toBe('yes');
    expect(await bytes(response)).toEqual([0, 1]);
  });

  it('says pieces are possible when the whole file is asked for', async () => {
    const response = await answerRange(get(), full());
    expect(response.status).toBe(200);
    expect(response.headers.get('Accept-Ranges')).toBe('bytes');
    expect(await bytes(response)).toEqual([...FILE]);
  });

  it('answers a range past the end with 416 and the size', async () => {
    const response = await answerRange(get('bytes=20-'), full());
    expect(response.status).toBe(416);
    expect(response.headers.get('Content-Range')).toBe('bytes */10');
    expect(response.headers.get('Content-Type')).toBeNull();
  });

  it('sends a piece only while If-Range still names the current file', async () => {
    expect((await answerRange(get('bytes=0-1', { 'If-Range': '"v1"' }), full())).status).toBe(206);
    const changed = await answerRange(get('bytes=0-1', { 'If-Range': '"v0"' }), full());
    expect(changed.status).toBe(200);
    expect(await bytes(changed)).toEqual([...FILE]);
  });

  it('answers HEAD with the whole file’s headers, saying pieces are possible', async () => {
    const response = await answerRange(get('bytes=0-1', {}, 'HEAD'), full());
    expect(response.status).toBe(200);
    expect(response.headers.get('Accept-Ranges')).toBe('bytes');
    expect(response.headers.get('Content-Length')).toBe('10');
  });

  it('passes on "not changed" (304) for a file the browser already has', async () => {
    const unchanged = new Response(null, { status: 304, headers: { ETag: '"v1"' } });
    const response = await answerRange(get('bytes=0-1'), unchanged);
    expect(response.status).toBe(304);
    expect(response.headers.get('Accept-Ranges')).toBe('bytes');
  });

  it.each(['bytes=0-1,4-5', 'items=0-1'])('sends the whole file for %s', async (range) => {
    const response = await answerRange(get(range), full());
    expect(response.status).toBe(200);
    expect(await bytes(response)).toEqual([...FILE]);
  });

  it('passes a missing file through unchanged', async () => {
    const missing = new Response('not found', { status: 404 });
    expect((await answerRange(get('bytes=0-1'), missing)).status).toBe(404);
  });
});

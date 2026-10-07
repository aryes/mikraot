/**
 * What an embedded video needs at build time (src/components/content/YouTube.astro): its picture
 * and its title, from YouTube's public image server and oEmbed endpoint (no key needed). The
 * build therefore needs network access; a stalled request fails it after a timeout instead of
 * hanging, and a video that no longer exists fails it with its id.
 */

export interface VideoDetails {
  /** The largest picture YouTube has for the video. */
  poster: string;
  /** The video's title, for screen readers ('' if YouTube doesn't say). */
  title: string;
}

const TIMEOUT_MS = 10_000;

export async function videoDetails(
  videoId: string,
  fetchFn: typeof fetch = fetch,
): Promise<VideoDetails> {
  const get = (url: string, method = 'GET') =>
    fetchFn(url, { method, signal: AbortSignal.timeout(TIMEOUT_MS) });
  // The large picture exists for most videos (a 404 otherwise); the small one for every video.
  const large = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const small = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  let poster = large;
  if (!(await get(large, 'HEAD')).ok) {
    if (!(await get(small, 'HEAD')).ok) {
      throw new Error(`YouTube video ${videoId} has no picture: deleted or private?`);
    }
    poster = small;
  }
  const oembed = await get(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://youtu.be/${videoId}`)}`,
  );
  const body: unknown = oembed.ok ? await oembed.json() : null;
  const title = body && typeof body === 'object' ? Reflect.get(body, 'title') : undefined;
  return { poster, title: typeof title === 'string' ? title : '' };
}

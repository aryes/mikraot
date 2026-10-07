import { describe, expect, it, vi } from 'vitest';
import { videoDetails } from './youtube-video';

/** A fake fetch answering by URL: status per URL substring, and the oEmbed title. */
const fakeFetch = (statuses: Record<string, number>, title?: string) =>
  vi.fn<typeof fetch>((input) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.includes('/oembed')) {
      return Promise.resolve(
        title === undefined ? new Response('', { status: 404 }) : Response.json({ title }),
      );
    }
    const status = Object.entries(statuses).find(([part]) => url.includes(part))?.[1] ?? 200;
    return Promise.resolve(new Response(null, { status }));
  });

describe('videoDetails', () => {
  it('prefers the large picture and takes the title from oEmbed', async () => {
    const details = await videoDetails('abc', fakeFetch({}, 'שיר הטעמים'));
    expect(details).toEqual({
      poster: 'https://i.ytimg.com/vi/abc/maxresdefault.jpg',
      title: 'שיר הטעמים',
    });
  });

  it('falls back to the small picture, and to no title', async () => {
    const details = await videoDetails('abc', fakeFetch({ maxresdefault: 404 }));
    expect(details).toEqual({ poster: 'https://i.ytimg.com/vi/abc/hqdefault.jpg', title: '' });
  });

  it('names the video when it no longer exists', async () => {
    const gone = fakeFetch({ maxresdefault: 404, hqdefault: 404 });
    await expect(videoDetails('abc', gone)).rejects.toThrow('abc');
  });
});

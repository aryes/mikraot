import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getUpdates, site } from '../../../lib/site';

/**
 * The "What's new" feed, served at /מה-חדש/feed/ (public/_redirects). The newsletter (Brevo RSS
 * campaign) sends what appears here.
 */
export const GET: APIRoute = async (context) => {
  const base = context.site ?? 'https://mikraot.net';
  return rss({
    title: `${site.title} - מה חדש`,
    description: site.tagline,
    site: base,
    customData: '<language>he-IL</language>',
    items: (await getUpdates()).map((update) => {
      const day = update.date.toISOString().slice(0, 10);
      return {
        title: update.title,
        // A page can be announced more than once: the date in the link makes each item new to
        // feed readers. Absolute, so the feed library leaves the URL as it is.
        link: new URL(`${update.url}#${day}`, base).href,
        pubDate: update.date,
        description: update.note,
      };
    }),
  });
};

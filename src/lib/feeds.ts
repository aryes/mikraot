/**
 * RSS feeds, at the live site's addresses: /feed/ (posts), /category/<slug>/feed/,
 * /sitemap.rss (all pages and posts) and /comments/feed/ (src/pages/comments/feed.ts).
 * The static feeds are built as index.xml files; public/_redirects serves them at the
 * WordPress URLs.
 */
import rss from '@astrojs/rss';
import { site as siteSettings, type SitePage } from './site';
import { excerptOf } from './urls';

const EXCERPT_WORDS = 55; // WordPress's default excerpt length

export function feed(title: string, site: URL | undefined, pages: SitePage[]): Promise<Response> {
  const base = site ?? 'https://mikraot.net';
  return rss({
    title,
    description: siteSettings.tagline,
    site: base,
    customData: '<language>he-IL</language>',
    items: pages.map(({ entry, url }) => ({
      title: entry.data.title,
      // Absolute, so the feed library leaves the URL as it is.
      link: new URL(url, base).href,
      pubDate: entry.data.date,
      description: entry.data.excerpt || excerptOf(entry.body ?? '', EXCERPT_WORDS),
    })),
  });
}

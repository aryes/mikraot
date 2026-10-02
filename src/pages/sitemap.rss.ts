import type { APIRoute } from 'astro';
import { feed } from '../lib/feeds';
import { getSitePages, site } from '../lib/site';

/** All pages and posts, newest first (All in One SEO's RSS sitemap, listed in robots.txt). */
export const GET: APIRoute = async (context) =>
  feed(
    site.title,
    context.site,
    (await getSitePages()).toSorted(
      (a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime(),
    ),
  );

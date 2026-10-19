import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
// The JSON file, not lib/site: that would pull the content collection into the Worker.
import site from '../../data/site.json';
import { findPage, getPageIndex } from '../../server/page-index';
import { listRecentComments } from '../../server/comments';
import { escapeHtml } from '../../server/notify';

// Comments change at any time, so this feed is built by the Worker on each request.
export const prerender = false;

const LIMIT = 20;

/** The newest comments on the whole site, at /comments/feed/ (as on WordPress). */
export const GET: APIRoute = async ({ url }) => {
  const [pages, comments] = await Promise.all([
    getPageIndex(env.ASSETS, url.origin),
    listRecentComments(env.DB, LIMIT),
  ]);
  const response = await rss({
    title: `תגובות - ${site.title}`,
    description: site.tagline,
    site: url.origin,
    customData: '<language>he-IL</language>',
    items: comments.map((comment) => {
      const page = findPage(pages, comment.page_slug);
      return {
        title: `תגובה ל"${page?.title ?? site.title}" מאת ${comment.author_name}`,
        // Absolute, so the feed library leaves the URL (with its #anchor) as it is.
        link: new URL(`${page?.url ?? '/'}#comment-${comment.id}`, url.origin).href,
        // D1 stores UTC as "YYYY-MM-DD HH:MM:SS".
        pubDate: new Date(`${comment.created_at.replace(' ', 'T')}Z`),
        // Readers show a description as HTML: the comment is plain text, so its < and & are
        // escaped first (the feed library escapes again, for the XML), and its lines kept.
        description: escapeHtml(comment.content).replace(/\r?\n/g, '<br>'),
      };
    }),
  });
  response.headers.set('Content-Type', 'application/rss+xml; charset=utf-8');
  response.headers.set('Cache-Control', 'public, max-age=300');
  return response;
};

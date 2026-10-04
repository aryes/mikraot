import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  MAX_BODY_BYTES,
  addComment,
  approvedCommentPage,
  listComments,
  parseNewComment,
  parsePageKeys,
} from '../../server/comments';
import { findPage, getPageIndex } from '../../server/page-index';
import { tokenFrom, verifyTurnstile } from '../../server/turnstile';

// Runs in the Worker on each request (the rest of the site is static).
export const prerender = false;

// public/_headers covers static files only, so the API sets its own.
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export const GET: APIRoute = async ({ url }) =>
  json(await listComments(env.DB, parsePageKeys(url.searchParams.get('page_slug'))));

export const POST: APIRoute = async ({ request, url, clientAddress }) => {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return json({ error: 'Too large' }, 413);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return json({ error: 'Too large' }, 413);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const comment = parseNewComment(body);
  if ('error' in comment) return json(comment, 400);

  try {
    const index = await getPageIndex(env.ASSETS, url.origin);
    const page = findPage(index, comment.page_slug);
    if (!page) return json({ error: 'Unknown page' }, 400);
    // A reply must answer an approved comment on the same page (old comments may be stored
    // under another key of the same page).
    if (comment.parent_id !== null) {
      const parentKey = await approvedCommentPage(env.DB, comment.parent_id);
      if (!parentKey || findPage(index, parentKey)?.url !== page.url) {
        return json({ error: 'Unknown parent' }, 400);
      }
    }
    const turnstileKey = env.TURNSTILE_SECRET_KEY;
    if (!turnstileKey) throw new Error('TURNSTILE_SECRET_KEY is not set');
    if (!(await verifyTurnstile(turnstileKey, tokenFrom(body), clientAddress))) {
      return json({ error: 'Human check failed' }, 403);
    }
    // Counted only for comments that would be saved, so rejected junk doesn't use up the quota.
    const { success } = await env.COMMENT_RATE_LIMIT.limit({ key: clientAddress });
    if (!success) return json({ error: 'Too many comments, try again in a minute' }, 429);
    return json(await addComment(env.DB, comment), 201);
  } catch (error) {
    console.error('POST /api/comments failed:', error);
    return json({ error: 'Internal error' }, 500);
  }
};

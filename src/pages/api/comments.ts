import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  MAX_BODY_BYTES,
  addComment,
  listComments,
  parseNewComment,
  parsePageKeys,
} from '../../server/comments';

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

/** The pages comments may be posted to, from the static comment-pages.json (read once). */
let commentPages: Promise<Set<string>> | undefined;
function getCommentPages(origin: string): Promise<Set<string>> {
  commentPages ??= env.ASSETS.fetch(new URL('/comment-pages.json', origin))
    .then(async (res): Promise<string[]> => {
      if (!res.ok) throw new Error(`comment-pages.json: ${res.status}`);
      return res.json();
    })
    .then((keys) => new Set(keys));
  // A failed read is retried on the next request instead of being cached.
  commentPages.catch(() => (commentPages = undefined));
  return commentPages;
}

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
    if (!(await getCommentPages(url.origin)).has(comment.page_slug)) {
      return json({ error: 'Unknown page' }, 400);
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

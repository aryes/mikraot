import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { addComment, listComments, parseNewComment, parsePageKeys } from '../../server/comments';

// Runs in the Worker on each request (the rest of the site is static).
export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });

export const GET: APIRoute = async ({ url }) =>
  json(await listComments(env.DB, parsePageKeys(url.searchParams.get('page_slug'))));

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const comment = parseNewComment(body);
  if ('error' in comment) return json(comment, 400);

  try {
    return json(await addComment(env.DB, comment), 201);
  } catch (error) {
    console.error('POST /api/comments failed:', error);
    return json({ error: 'Internal error' }, 500);
  }
};

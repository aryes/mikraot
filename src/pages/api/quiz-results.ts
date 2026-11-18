import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { signedInUser, withinVisitorLimit } from '../../server/auth-route';
import { MAX_BODY_BYTES, parseUpload, syncResults } from '../../server/quiz-results';

// Runs in the Worker on each request (the rest of the site is static).
export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

/**
 * A signed-in browser's quiz results in, the account's other devices' out
 * (src/server/quiz-results.ts, src/lib/quiz-sync.ts).
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  // Its session cookie is sent with any request to the site: only the site's own pages may ask.
  if (request.headers.get('Sec-Fetch-Site') === 'cross-site')
    return json({ error: 'Forbidden' }, 403);
  if (!(await withinVisitorLimit(env.AUTH_API_RATE_LIMIT, clientAddress))) {
    return json({ error: 'Too many requests, try again in a minute' }, 429);
  }
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return json({ error: 'Too large' }, 413);
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES)
    return json({ error: 'Too large' }, 413);
  const userId = await signedInUser(request);
  if (!userId) return json({ error: 'Not signed in' }, 401);
  if (!(await env.QUIZ_SYNC_RATE_LIMIT.limit({ key: userId })).success) {
    return json({ error: 'Too many requests, try again in a minute' }, 429);
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const upload = parseUpload(body);
  if ('error' in upload) return json(upload, 400);
  return json(await syncResults(env.DB, userId, upload, new Date()));
};

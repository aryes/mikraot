import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { rateLimitKey } from '../../server/rate-limit-key';
import { MAX_REPORT_BYTES, parseSearchMiss, recordSearchMiss } from '../../server/search-misses';

// Runs in the Worker on each request (the rest of the site is static).
export const prerender = false;

// Nothing to tell the browser: the report is fire-and-forget (navigator.sendBeacon).
const done = (status = 204) =>
  new Response(null, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (Number(request.headers.get('content-length')) > MAX_REPORT_BYTES) return done(413);
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_REPORT_BYTES) return done(413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return done(400);
  }
  const query = parseSearchMiss(body);
  if (!query) return done(400);
  const { success } = await env.SEARCH_RATE_LIMIT.limit({ key: rateLimitKey(clientAddress) });
  if (!success) return done(429);
  recordSearchMiss(env.SEARCH_MISSES, query);
  return done();
};

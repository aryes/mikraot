import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { MAX_REPORT_BYTES, parseClientError } from '../../server/client-errors';
import { rateLimitKey } from '../../server/rate-limit-key';

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
  const report = parseClientError(body);
  if (!report) return done(400);
  const { success } = await env.CLIENT_ERROR_RATE_LIMIT.limit({ key: rateLimitKey(clientAddress) });
  if (!success) return done(429);
  console.warn(
    'Browser error:',
    JSON.stringify({ ...report, userAgent: request.headers.get('user-agent') ?? '' }),
  );
  return done();
};

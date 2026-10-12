import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { addedToList, sameSecret, welcome } from '../../server/newsletter';

// Runs in the Worker on each request (the rest of the site is static).
export const prerender = false;

const done = (status: number) =>
  new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Brevo's call when contacts join the newsletter list (a marketing webhook, event listAddition,
 * made through Brevo's API with the header below): the welcome email and the owner's notice.
 * The header's value is a Worker secret, known only to Brevo.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const expected = env.NEWSLETTER_WEBHOOK_SECRET;
  if (!expected || !(await sameSecret(request.headers.get('x-webhook-secret') ?? '', expected))) {
    return done(403);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return done(400);
  }
  const apiKey = env.BREVO_API_KEY;
  if (apiKey) {
    for (const subscriber of addedToList(body)) {
      // In the background, so Brevo gets its answer at once (it retries slow webhooks).
      locals.cfContext.waitUntil(
        welcome(apiKey, subscriber, 'https://mikraot.net/').catch((error: unknown) => {
          console.error('Newsletter welcome failed:', error);
        }),
      );
    }
  }
  return done(204);
};

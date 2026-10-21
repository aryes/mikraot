import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import {
  isBlocked,
  MAX_BODY_BYTES,
  parseSignup,
  requestConfirmation,
} from '../../server/newsletter';
import { rateLimitKey } from '../../server/rate-limit-key';
import { tokenFrom, verifyTurnstile } from '../../server/turnstile';

// Runs in the Worker on each request (the rest of the site is static).
export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });

/** Newsletter sign-up from the footer form (src/components/NewsletterSignup.tsx). */
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
  const signup = parseSignup(body);
  if ('error' in signup) return json(signup, 400);

  const turnstileKey = env.TURNSTILE_SECRET_KEY;
  if (!turnstileKey) throw new Error('TURNSTILE_SECRET_KEY is not set');
  if (
    !(await verifyTurnstile({
      key: turnstileKey,
      token: tokenFrom(body),
      remoteIp: clientAddress,
      hostname: url.hostname,
      action: 'newsletter',
    }))
  ) {
    return json({ error: 'Human check failed' }, 403);
  }
  // Each sign-up may send an email (from Brevo's daily allowance; none to an address already on
  // the list): a few a minute per visitor, and one a minute per address, so no one can flood
  // someone else's inbox from many connections.
  const perVisitor = await env.NEWSLETTER_RATE_LIMIT.limit({ key: rateLimitKey(clientAddress) });
  const perAddress = await env.NEWSLETTER_EMAIL_RATE_LIMIT.limit({ key: signup.email });
  if (!perVisitor.success || !perAddress.success) {
    return json({ error: 'Too many sign-ups, try again in a minute' }, 429);
  }
  // Blocked addresses get the usual answer: nothing to learn by trying.
  if (isBlocked(signup.email)) return json({ ok: true });
  // Without a key (branch previews, local runs) nothing is sent.
  if (env.BREVO_API_KEY) await requestConfirmation(env.BREVO_API_KEY, signup, url.origin);
  return json({ ok: true });
};

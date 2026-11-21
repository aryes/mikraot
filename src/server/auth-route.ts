/**
 * The sign-in API (Better Auth, src/server/auth.ts) at /api/auth/, answered by src/worker.ts
 * before Astro: Better Auth's addresses (Google's return address among them) have no trailing
 * slash, which Astro's routes require (`trailingSlash: 'always'`).
 */
import { env } from 'cloudflare:workers';
import { AUTH_BASE_PATH, createAuth, signInEmail } from './auth';
import { sendEmail } from './email';
import { rateLimitKey } from './rate-limit-key';
import { tokenFrom, verifyTurnstile } from './turnstile';

/** A sign-in request is an address and the human check's token. */
const MAX_BODY_BYTES = 4_000;

/**
 * Better Auth's endpoints the site uses; the rest answer 404, so a feature nobody turned on in
 * the site can't be reached by a later Better Auth default.
 */
const ENDPOINTS = new Set([
  'POST /sign-in/magic-link',
  'GET /magic-link/verify',
  'GET /get-session',
  'POST /sign-out',
  'POST /delete-user',
  'POST /sign-in/social',
  'GET /callback/google',
  'POST /callback/google',
]);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

/**
 * Local runs and tests (AUTH_SHOW_LINK, in .dev.vars only; never on a published Worker) have no
 * email key: the sign-in link is answered to the page, which shows it, so sign-in can be tried there. Keyed
 * by address, kept only until the request that made it answers.
 */
const shownLinks = new Map<string, string>();

/**
 * Shared by a Worker instance's requests once its start has finished: building one costs about
 * 10 ms of CPU (measured on a preview, 2026-11-18), the free plan's whole allowance for a request.
 * Not before: Workers lets no request await another's work, and requests that waited on the first
 * one's start hung (seen under parallel tests, 2026-11-18). Those build their own.
 */
let ready: ReturnType<typeof createAuth> | undefined;

function auth() {
  if (ready) return ready;
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET is not set');
  const [apiKey, showLink] = [env.BREVO_API_KEY, env.AUTH_SHOW_LINK === '1'];
  if (!apiKey && !showLink) throw new Error('BREVO_API_KEY is not set');
  const google =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
      : undefined;
  const made = createAuth({
    db: env.DB,
    secret,
    google,
    trustLocal: showLink,
    sendLink: async (email, link) => {
      // With a key, always by email: a production Worker never shows a link.
      if (apiKey) await sendEmail(apiKey, signInEmail(email, link));
      // As a path: locally wrangler presents the site's address as mikraot.net's.
      else {
        const { pathname, hash } = new URL(link);
        shownLinks.set(email.toLowerCase(), pathname + hash);
      }
    },
  });
  made.$context.then(
    () => (ready ??= made),
    () => undefined,
  );
  return made;
}

/** The signed-in learner's account id, from the request's session cookie; null if none. */
export async function signedInUser(request: Request): Promise<string | null> {
  const session = await auth().api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

/**
 * A visitor's limits (sign-in links, any sign-in request) hold wherever emails are sent. Local
 * runs and tests send none, and every test comes from one address.
 */
export async function withinVisitorLimit(
  limiter: { limit(options: { key: string }): Promise<{ success: boolean }> },
  clientAddress: string,
): Promise<boolean> {
  if (env.AUTH_SHOW_LINK === '1') return true;
  return (await limiter.limit({ key: rateLimitKey(clientAddress) })).success;
}

/** Asking for a sign-in link: a human, a few a minute per visitor, one a minute per address. */
async function checkLinkRequest(request: Request, url: URL, clientAddress: string) {
  if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
    return { refused: json({ error: 'Too large' }, 413) };
  }
  const text = await request.clone().text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    return { refused: json({ error: 'Too large' }, 413) };
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { refused: json({ error: 'Invalid JSON' }, 400) };
  }
  const given = body && typeof body === 'object' ? Reflect.get(body, 'email') : undefined;
  const email = typeof given === 'string' ? given.trim().toLowerCase() : '';
  if (!email) return { refused: json({ error: 'Missing email' }, 400) };
  const key = env.TURNSTILE_SECRET_KEY;
  if (!key) throw new Error('TURNSTILE_SECRET_KEY is not set');
  const human = await verifyTurnstile({
    key,
    token: tokenFrom(body),
    remoteIp: clientAddress,
    hostname: url.hostname,
    action: 'signin',
  });
  if (!human) return { refused: json({ error: 'Human check failed' }, 403) };
  const perVisitor = await withinVisitorLimit(env.AUTH_RATE_LIMIT, clientAddress);
  const perAddress = await env.AUTH_EMAIL_RATE_LIMIT.limit({ key: email });
  if (!perVisitor || !perAddress.success) {
    return { refused: json({ error: 'Too many requests, try again in a minute' }, 429) };
  }
  return { email };
}

/** Better Auth's answer to a request under /api/auth/, behind the checks above; null for others. */
export async function authApi(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(`${AUTH_BASE_PATH}/`)) return null;
  const clientAddress = request.headers.get('CF-Connecting-IP') ?? '';
  const endpoint = `${request.method} ${url.pathname.slice(AUTH_BASE_PATH.length)}`;
  if (!ENDPOINTS.has(endpoint)) return json({ error: 'Not found' }, 404);
  // Every endpoint, a visitor's normal use far below it: Better Auth's own limits are counted in
  // memory, which a new instance per request starts afresh.
  if (!(await withinVisitorLimit(env.AUTH_API_RATE_LIMIT, clientAddress))) {
    return json({ error: 'Too many requests, try again in a minute' }, 429);
  }
  if (endpoint !== 'POST /sign-in/magic-link') return auth().handler(request);

  const check = await checkLinkRequest(request, url, clientAddress);
  if ('refused' in check) return check.refused;
  const answer = await auth().handler(request);
  const link = shownLinks.get(check.email);
  shownLinks.delete(check.email);
  if (!link || !answer.ok) return answer;
  return json({ status: true, link });
}

/**
 * Optional accounts (since 2026-11-18, Arye): a learner may sign in to keep their progress across
 * devices; the whole site works without it. Better Auth (https://better-auth.com) runs inside this
 * Worker and keeps the accounts in our D1 database (migrations/0006_accounts.sql), so no outside
 * service holds them (decided with Arye, 2026-10-03).
 *
 * Sign-in is by an emailed link (no passwords to keep or leak), or by Google (its app: the
 * secrets GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET; Google returns to /api/auth/callback/google).
 * The link leads to the account page (src/pages/account.astro) with its token after `#`, and the page's script signs in: a link
 * leading straight to the API would be used up by mail services that open links to scan them,
 * and the part after `#` never reaches a server's logs or the site's statistics.
 *
 * Kept as little as possible: no IP address or browser in a session, no Google tokens (the site
 * never calls Google for the learner) or profile picture, and sign-in links stored hashed for their 10 minutes.
 */
import { betterAuth, type BetterAuthOptions, type D1Database } from 'better-auth';
import { magicLink } from 'better-auth/plugins/magic-link';

import type { BrevoEmail } from './email';
import { escapeHtml, OWNER_EMAIL } from './notify';
import { ACCOUNT_URL } from '../lib/urls';

/** Where the API is (src/server/auth-route.ts, answered by src/worker.ts): Better Auth's default. */
export const AUTH_BASE_PATH = '/api/auth';
/** How long a sign-in link works. Mail can be slow: 10 minutes, not Better Auth's 5. */
export const LINK_MINUTES = 10;

/**
 * The hosts the API answers for: the site and its branch previews, and local runs where trusted
 * (`trustLocal`). Better Auth takes its own address from the request only for one of these, and
 * trusts requests from their origins.
 */
export const SITE_HOSTS = ['mikraot.net', '*-mikraot.mikraot-app.workers.dev'];
const LOCAL_HOSTS = ['localhost:*', '127.0.0.1:*'];

/** The sign-in link: the account page, with the token where no server sees it. */
export const signInLink = (origin: string, token: string) =>
  `${origin}${ACCOUNT_URL}#signin=${encodeURIComponent(token)}`;

export function signInEmail(to: string, link: string): BrevoEmail {
  const href = escapeHtml(link);
  return {
    sender: { name: 'מקראות', email: OWNER_EMAIL },
    to: [{ email: to }],
    subject: 'קישור להתחברות למקראות',
    textContent: `להתחברות למקראות, פתחו את הקישור הזה (הוא עובד פעם אחת, במשך ${LINK_MINUTES} דקות):\n\n${link}\n\nלא ביקשתם להתחבר? אפשר להתעלם מהאימייל הזה.`,
    htmlContent: `<div dir="rtl" style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; text-align: right">
<p style="font-size: 20px; font-weight: bold; color: #3e5a24">התחברות למקראות</p>
<p><a href="${href}" style="display: inline-block; padding: 10px 20px; border-radius: 10px; background: #5b763e; color: #ffffff; text-decoration: none; font-weight: bold">התחברות</a></p>
<p>הקישור עובד פעם אחת, במשך ${LINK_MINUTES} דקות.</p>
<p style="color: #666; font-size: 0.9em">לא ביקשתם להתחבר? אפשר להתעלם מהאימייל הזה.</p>
</div>`,
  };
}

export interface AuthSettings {
  db: D1Database;
  /** Signs the session cookies (BETTER_AUTH_SECRET). */
  secret: string;
  /** Sends a sign-in link to an address. */
  sendLink: (email: string, link: string) => Promise<void>;
  google?: { clientId: string; clientSecret: string } | undefined;
  /**
   * Local runs and tests: wrangler presents every request as one to http://mikraot.net (its
   * address and its origin), so that and the browser's own address are trusted as well. Never in
   * production.
   */
  trustLocal?: boolean;
}

export function authOptions(settings: AuthSettings) {
  const { db, secret, sendLink, google, trustLocal = false } = settings;
  return {
    database: db,
    secret,
    basePath: AUTH_BASE_PATH,
    baseURL: { allowedHosts: trustLocal ? [...SITE_HOSTS, ...LOCAL_HOSTS] : SITE_HOSTS },
    ...(trustLocal && {
      trustedOrigins: ['http://mikraot.net', 'http://localhost:*', 'http://127.0.0.1:*'],
    }),
    telemetry: { enabled: false },
    // Cloudflare's address of the visitor, for Better Auth's own rate limits (not stored).
    advanced: {
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
      // Not checked against the database on each start (a few queries for each new instance:
      // src/server/auth-route.ts). migrations/0006_accounts.sql is Better Auth's own schema, and
      // e2e/account.spec.ts signs in through it.
      database: { validateSchema: false },
    },
    session: {
      // Signed in for two months of not visiting; each visit (at most daily) extends it.
      expiresIn: 60 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
    },
    user: {
      // Asked for again within a day of signing in (Better Auth's `freshAge`), else signing in again.
      deleteUser: { enabled: true },
    },
    // Google asks which of its accounts each time: a shared computer may be signed in to someone
    // else's.
    ...(google && {
      socialProviders: { google: { ...google, prompt: 'select_account' as const } },
    }),
    // A sign-in with Google that fails comes back to the account page (with `?error=`), not to
    // Better Auth's own error page.
    onAPIError: { errorURL: ACCOUNT_URL },
    databaseHooks: {
      // Of a provider's profile, the email and name only: not the picture's address.
      user: {
        create: { before: (user) => Promise.resolve({ data: { ...user, image: null } }) },
        update: { before: (user) => Promise.resolve({ data: { ...user, image: null } }) },
      },
      session: {
        create: {
          before: (session) =>
            Promise.resolve({ data: { ...session, ipAddress: null, userAgent: null } }),
        },
      },
      account: {
        create: { before: (account) => Promise.resolve({ data: withoutTokens(account) }) },
        update: { before: (account) => Promise.resolve({ data: withoutTokens(account) }) },
      },
    },
    plugins: [
      magicLink({
        expiresIn: LINK_MINUTES * 60,
        storeToken: 'hashed',
        sendMagicLink: async ({ email, token }, ctx) => {
          const origin = new URL(ctx?.context.baseURL ?? '').origin;
          await sendLink(email, signInLink(origin, token));
        },
      }),
    ],
  } satisfies BetterAuthOptions;
}

/** A provider's tokens, never used by the site, are not kept. */
function withoutTokens<T extends object>(account: T): T {
  return { ...account, accessToken: null, refreshToken: null, idToken: null };
}

export const createAuth = (settings: AuthSettings) => betterAuth(authOptions(settings));

/** The part of D1 the clean-up uses. */
export interface CleanupDb {
  prepare(query: string): { bind(...values: unknown[]): { all(): Promise<unknown> } };
}

/**
 * Sign-in links nobody used and sessions that ran out (Better Auth removes them only when someone
 * tries them): deleted by the daily run (src/worker.ts), so an address asked for and never used
 * isn't kept. Dates are ISO text, which compares in time order.
 */
export async function removeExpired(db: CleanupDb, now: Date): Promise<void> {
  await Promise.all(
    ['verification', 'session'].map((table) =>
      db.prepare(`DELETE FROM "${table}" WHERE "expiresAt" < ?`).bind(now.toISOString()).all(),
    ),
  );
}

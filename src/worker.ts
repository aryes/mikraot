/**
 * The Worker's entry point: Astro's request handler, plus the daily database backup
 * (wrangler.jsonc `triggers.crons`). Server errors and a failed backup email the owner
 * (src/server/alerts.ts). Mail apps' one-click unsubscribe is answered here, before Astro
 * (src/server/one-click-unsubscribe.ts), and recordings asked for in pieces by the Worker itself
 * (src/server/audio-range.ts). Emails Brevo refused are sent again from a queue
 * (src/server/email.ts). Sentry records the errors with their details (src/server/sentry.ts).
 */
import { handle } from '@astrojs/cloudflare/handler';
import * as Sentry from '@sentry/cloudflare';
import { PUBLIC_SENTRY_DSN } from 'astro:env/client';
import { env } from 'cloudflare:workers';
import { alertOwner, type AlertKind } from './server/alerts';
import { answerRange } from './server/audio-range';
import { backupDatabase } from './server/backup';
import { retryEmails, type RetryMessage } from './server/email';
import { unsubscribeReplies } from './server/comments';
import { unsubscribeNewsletter } from './server/newsletter';
import { oneClickUnsubscribe } from './server/one-click-unsubscribe';
import { sentryOptions } from './lib/sentry';

interface Context {
  waitUntil(promise: Promise<unknown>): void;
}

const alert = (context: Context, kind: AlertKind, detail: string) => {
  context.waitUntil(
    alertOwner({
      apiKey: env.BREVO_API_KEY,
      store: env.ALERTS,
      limiter: env.ALERT_RATE_LIMIT,
      kind,
      detail,
      now: new Date(),
      retry: env.EMAIL_RETRY,
    }),
  );
};

/**
 * Reads a request body the site answered without reading (a refused or oversized post). Since
 * wrangler 4.149 (2026-10-12) the local server fails the next request on the same connection
 * otherwise (docs/ROADMAP.md); Cloudflare itself doesn't need it. In the background, after the
 * answer, so a refusal stays as quick as before.
 */
const drainUnreadBody = (request: Request, context: Context) => {
  if (request.body && !request.bodyUsed) context.waitUntil(request.arrayBuffer().catch(() => null));
};

export default Sentry.withSentry(() => sentryOptions(PUBLIC_SENTRY_DSN), {
  async fetch(...args: Parameters<typeof handle>) {
    const [request, , context] = args;
    const where = `${request.method} ${new URL(request.url).pathname}`;
    try {
      if ((request.method === 'GET' || request.method === 'HEAD') && where.endsWith('.mp3')) {
        // The whole file from the assets; the browser's other headers (If-None-Match) still apply.
        const whole = new Request(request.url, { headers: request.headers });
        whole.headers.delete('Range');
        return await answerRange(request, await env.ASSETS.fetch(whole));
      }
      const unsubscribe = await oneClickUnsubscribe(request);
      if (unsubscribe !== null) {
        const { stop, token } = unsubscribe;
        if (stop === 'replies') await unsubscribeReplies(env.DB, token);
        else {
          const [apiKey, secret] = [env.BREVO_API_KEY, env.NEWSLETTER_WEBHOOK_SECRET];
          // A Brevo failure throws: a 500 (and an alert to Arye) for that valid token only.
          await unsubscribeNewsletter({ apiKey, secret, token });
        }
        drainUnreadBody(request, context); // only a clone was read
        // The same answer for any token: nothing to learn about which tokens exist.
        return new Response('Unsubscribed', { headers: { 'Cache-Control': 'no-store' } });
      }
      const response = await handle(...args);
      drainUnreadBody(request, context);
      if (response.status >= 500) {
        // Astro answers an error thrown in a page or API route with a 500 (logging it), so the
        // error itself never reaches Sentry's wrapper: record which request failed.
        Sentry.captureMessage(`${where}: ${response.status}`, 'error');
        alert(context, 'request', `${where}: ${response.status}`);
      }
      return response;
    } catch (error) {
      // Thrown before Astro could answer: still reported, then left to Workers (a 500).
      alert(context, 'request', `${where}: ${String(error)}`);
      throw error;
    }
  },
  // Emails Brevo refused, sent again (wrangler.jsonc `queues`).
  async queue(batch: { messages: readonly RetryMessage[] }) {
    await retryEmails(batch.messages, env.BREVO_API_KEY);
  },
  async scheduled(_controller: unknown, _env: unknown, context: Context) {
    try {
      await backupDatabase(env.DB, env.BACKUPS, new Date());
    } catch (error) {
      alert(context, 'backup', String(error));
      // Rethrown so the run is recorded as failed (with the error) in the Worker logs.
      throw error;
    }
  },
});

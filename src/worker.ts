/**
 * The Worker's entry point: Astro's request handler, plus the daily database backup
 * (wrangler.jsonc `triggers.crons`). Server errors and a failed backup email the owner
 * (src/server/alerts.ts).
 */
import { handle } from '@astrojs/cloudflare/handler';
import { env } from 'cloudflare:workers';
import { alertOwner, type AlertKind } from './server/alerts';
import { backupDatabase } from './server/backup';

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
    }),
  );
};

export default {
  async fetch(...args: Parameters<typeof handle>) {
    const [request, , context] = args;
    const where = `${request.method} ${new URL(request.url).pathname}`;
    try {
      const response = await handle(...args);
      if (response.status >= 500) alert(context, 'request', `${where}: ${response.status}`);
      return response;
    } catch (error) {
      // Thrown before Astro could answer: still reported, then left to Workers (a 500).
      alert(context, 'request', `${where}: ${String(error)}`);
      throw error;
    }
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
};

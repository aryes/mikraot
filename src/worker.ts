/**
 * The Worker's entry point: Astro's request handler, plus the daily database backup
 * (wrangler.jsonc `triggers.crons`).
 */
import { handle } from '@astrojs/cloudflare/handler';
import { env } from 'cloudflare:workers';
import { backupDatabase } from './server/backup';

export default {
  fetch: handle,
  scheduled(
    _controller: unknown,
    _env: unknown,
    context: { waitUntil(p: Promise<unknown>): void },
  ) {
    // A failure is logged by Workers with the scheduled run (Workers Logs / observability).
    context.waitUntil(backupDatabase(env.DB, env.BACKUPS, new Date()));
  },
};

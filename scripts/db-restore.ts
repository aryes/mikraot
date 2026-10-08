/**
 * Restores the production database, with the safety steps built in (docs/OPERATIONS.md):
 *
 *   npm run db:restore -- 2026-10-01             from the daily backup of that date (Workers KV)
 *   npm run db:restore -- 2026-10-07T09:30:00Z   to that moment (D1 Time Travel, last 7 days)
 *   npm run db:restore -- latest                 from the newest daily backup
 *
 * Without --yes it only shows the plan: the rows now and in the restored state. With --yes it
 * first exports the current database to .backups/, then restores, then shows the rows again.
 * Restoring production needs Arye's approval (CLAUDE.md): show him the plan, then run with --yes.
 * --local works on the local database (daily backups only), for testing this script.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { z } from 'astro/zod';
import { backupToSql, TABLES_QUERY, type Backup } from '../src/server/backup';

const DATABASE = 'mikraot-db';
const args = process.argv.slice(2);
const target = args.find((arg) => !arg.startsWith('--'));
const confirmed = args.includes('--yes');
const local = args.includes('--local');
const where = local ? '--local' : '--remote';

const usage = () => {
  console.error(
    'Usage: npm run db:restore -- <YYYY-MM-DD | time with zone, e.g. 2026-10-07T09:30:00Z | latest> [--yes] [--local]',
  );
  process.exit(2);
};
if (!target) usage();
const isDate = /^\d{4}-\d{2}-\d{2}$/.test(target ?? '');
// A time must name its zone (wrangler requires it): 2026-10-07T09:30:00Z or …+03:00.
const isTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(
  target ?? '',
);
if (!isDate && !isTime && target !== 'latest') usage();
if (isTime && local) {
  console.error('Time Travel exists only for the remote database.');
  process.exit(2);
}

// Wrangler's own script run by Node, without a shell: SQL passed as an argument keeps its spaces
// and quotes on Windows too.
const wrangler = (...wranglerArgs: string[]) =>
  execFileSync(
    process.execPath,
    ['node_modules/wrangler/bin/wrangler.js', ...wranglerArgs, '--config', 'wrangler.jsonc'],
    { encoding: 'utf8', maxBuffer: 64 << 20 },
  );

/** Rows per application table, now. */
function rowCounts(): Record<string, number> {
  const tables =
    z
      .array(z.object({ results: z.array(z.object({ name: z.string() })) }))
      .parse(
        JSON.parse(wrangler('d1', 'execute', DATABASE, where, '--json', '--command', TABLES_QUERY)),
      )[0]?.results ?? [];
  if (tables.length === 0) return {};
  const query = tables
    .map(
      ({ name }) =>
        `SELECT '${name.replaceAll("'", "''")}' AS name, count(*) AS n FROM "${name.replaceAll('"', '""')}"`,
    )
    .join(' UNION ALL ');
  const counts =
    z
      .array(z.object({ results: z.array(z.object({ name: z.string(), n: z.number() })) }))
      .parse(
        JSON.parse(wrangler('d1', 'execute', DATABASE, where, '--json', '--command', query)),
      )[0]?.results ?? [];
  return Object.fromEntries(counts.map(({ name, n }) => [name, n]));
}

const show = (label: string, counts: Record<string, number>) => {
  const list = Object.entries(counts).map(([table, n]) => `${table} ${n}`);
  console.log(`${label}: ${list.join(', ') || 'no tables'}`);
};

/** The daily backup to restore, as SQL in .backups/ (git-ignored: it holds emails). */
function backupPlan(): { file: string; counts: Record<string, number> } {
  const keys = z
    .array(z.object({ name: z.string() }))
    .parse(JSON.parse(wrangler('kv', 'key', 'list', '--binding', 'BACKUPS', where)))
    .map((key) => key.name)
    .toSorted();
  const key = target === 'latest' ? keys.at(-1) : `d1/${target ?? ''}.json`;
  if (!key || !keys.includes(key)) {
    console.error(`No backup for ${target ?? ''}. Available: ${keys.join(', ') || 'none'}`);
    process.exit(1);
  }
  const backup: Backup = z
    .object({
      createdAt: z.string(),
      tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
    })
    .parse(JSON.parse(wrangler('kv', 'key', 'get', key, '--binding', 'BACKUPS', where)));
  mkdirSync('.backups', { recursive: true });
  const file = `.backups/restore-${key.slice(3, 13)}.sql`;
  writeFileSync(file, backupToSql(backup));
  console.log(`Backup of ${backup.createdAt} → ${file}`);
  return {
    file,
    counts: Object.fromEntries(Object.entries(backup.tables).map(([t, rows]) => [t, rows.length])),
  };
}

show('Now', rowCounts());
const plan = isTime ? undefined : backupPlan();
if (plan) show('Restored', plan.counts);
else {
  const info = wrangler(
    'd1',
    'time-travel',
    'info',
    DATABASE,
    `--timestamp=${target ?? ''}`,
    '--json',
  );
  console.log(`Time Travel to ${target ?? ''}: ${info.trim()}`);
  console.log('(The whole database returns to that moment; row counts are known only after.)');
}

if (!confirmed) {
  console.log(
    "\nNothing changed. To restore, run again with --yes (production: with Arye's approval).",
  );
  process.exit(0);
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const exportFile = `.backups/before-restore-${stamp}.sql`;
mkdirSync('.backups', { recursive: true });
wrangler('d1', 'export', DATABASE, where, '--output', exportFile);
console.log(`\nExported the current database to ${exportFile}`);

if (plan) {
  wrangler('d1', 'execute', DATABASE, where, '--file', plan.file);
} else {
  const result = wrangler(
    'd1',
    'time-travel',
    'restore',
    DATABASE,
    `--timestamp=${target ?? ''}`,
    '--json',
  );
  console.log(`Time Travel: ${result.trim()}`);
  console.log(
    'To undo: npx wrangler d1 time-travel restore mikraot-db --bookmark=<previous bookmark above> --config wrangler.jsonc',
  );
}
show('After', rowCounts());
console.log('Check the comments on a page, then delete the files in .backups/.');

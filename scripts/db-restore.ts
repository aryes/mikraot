/**
 * Restores the production database, with the safety steps built in. The instructions are in HELP
 * below (`npm run db:restore` prints them); background in docs/OPERATIONS.md.
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

const HELP = `Restore the site's database (comments) to an earlier state.

  npm run db:restore -- <target> [--yes] [--local]

<target> is one of:
  2026-10-01            that day's daily backup (taken at 02:17 UTC, kept about 13 months)
  latest                the newest daily backup
  2026-10-07T09:30:00Z  that exact moment, from the database's own history (last 7 days only).
                        The time must end with its zone: Z for UTC, or +03:00 for Israel in
                        summer (+02:00 in winter).

Steps:
  1. Run without --yes. Nothing changes: it shows the rows now and after the restore.
  2. Show that plan to Arye; restoring the live site needs his approval.
  3. Run the same command with --yes. It first saves the current database to .backups/,
     then restores, then shows the rows again.
  4. Open a page with comments to check, re-apply the deletions on request listed in
     docs/OPERATIONS.md that are newer than the restored state, then delete the files in .backups/
     (they hold commenters' emails; the folder is never committed).

Options:
  --yes     really restore (without it: only the plan)
  --local   use the local test database instead of the live one (daily backups only)
  --help    this text

Undo: before restoring, --yes prints the command that returns the live database to a minute
before the restore (from the database's history, within 7 days), with --yes included; it too
needs Arye's approval. The copy in .backups/before-restore-<time>.sql is a second safety net
(see docs/OPERATIONS.md).`;

const usage = (problem?: string) => {
  if (problem) console.error(`${problem}\n`);
  console.error(HELP);
  process.exit(problem ? 2 : 0);
};
if (!target || args.includes('--help')) usage();
const isDate = /^\d{4}-\d{2}-\d{2}$/.test(target ?? '');
// A time must name its zone (wrangler requires it): 2026-10-07T09:30:00Z or …+03:00.
const isTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(
  target ?? '',
);
if (!isDate && !isTime && target !== 'latest')
  usage(`Not a date, a time with its zone, or latest: ${target ?? ''}`);
const unknown = args.filter(
  (arg) => arg.startsWith('--') && !['--yes', '--local', '--help'].includes(arg),
);
if (unknown.length > 0) usage(`Unknown option: ${unknown.join(' ')}`);
if (isTime && local) {
  usage('A moment in time works only on the live database (--local has daily backups only).');
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

// The moment to return to if this restore was a mistake: a minute back, in case this computer's
// clock runs ahead of Cloudflare's; whole seconds, with its zone.
const before = `${new Date(Date.now() - 60_000).toISOString().slice(0, 19)}Z`;
const stamp = before.replace(/:/g, '-');
const exportFile = `.backups/before-restore-${stamp}.sql`;
mkdirSync('.backups', { recursive: true });
wrangler('d1', 'export', DATABASE, where, '--output', exportFile);
console.log(`\nExported the current database to ${exportFile}`);
// Printed before restoring, so it is on screen even if the restore fails halfway.
if (!local) {
  console.log(`To undo (with Arye's approval): npm run db:restore -- ${before} --yes`);
}

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
}
show('After', rowCounts());
console.log(
  'Check the comments on a page. Re-apply the deletions on request newer than the restored state\n' +
    '(docs/OPERATIONS.md, "Delete a comment or an email on request"), then delete the files in .backups/.',
);

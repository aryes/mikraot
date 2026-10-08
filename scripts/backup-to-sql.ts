/**
 * Turns a daily backup (src/server/backup.ts) into SQL that restores it:
 * `npm run backup:restore -- [YYYY-MM-DD]` (default: the newest) writes
 * `.backups/restore-<date>.sql` (git-ignored: it holds commenters' emails) and prints the command
 * that loads it. Nothing is written to the database here; restoring production needs Arye's
 * approval (CLAUDE.md), after a fresh export.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { z } from 'astro/zod';
import { backupToSql, type Backup } from '../src/server/backup';

const wrangler = (...args: string[]) =>
  execFileSync('npx', ['wrangler', ...args, '--config', 'wrangler.jsonc'], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 64 << 20,
  });

const date = process.argv[2];
if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('Usage: npm run backup:restore -- [YYYY-MM-DD]');
  process.exit(2);
}
const keys = z
  .array(z.object({ name: z.string() }))
  .parse(JSON.parse(wrangler('kv', 'key', 'list', '--binding', 'BACKUPS', '--remote')))
  .map((key) => key.name)
  .toSorted();
const key = date ? `d1/${date}.json` : keys.at(-1);
if (!key || !keys.includes(key)) {
  console.error(`No backup ${key ?? ''}. Available: ${keys.join(', ') || 'none'}`);
  process.exit(1);
}
const backup: Backup = z
  .object({
    createdAt: z.string(),
    tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  })
  .parse(JSON.parse(wrangler('kv', 'key', 'get', key, '--binding', 'BACKUPS', '--remote')));
mkdirSync('.backups', { recursive: true });
const file = `.backups/restore-${key.slice(3, 13)}.sql`;
writeFileSync(file, backupToSql(backup));
const counts = Object.entries(backup.tables).map(([table, rows]) => `${table} ${rows.length}`);
console.log(`${file}: backup of ${backup.createdAt} (${counts.join(', ')})`);
console.log(
  `Load it: npx wrangler d1 execute mikraot-db --remote --config wrangler.jsonc --file ${file}`,
);

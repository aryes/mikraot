/**
 * Daily backup of the database (comments, and any later tables) to Workers KV. D1 itself can be
 * restored only 7 days back on the free plan; these copies reach further. Restore with
 * `npm run db:restore` (scripts/db-restore.ts).
 */

interface BackupStatement {
  // Mirrors D1's API: the caller states the row type it selected.
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters
  all<T>(): Promise<{ results: T[] }>;
}

export interface BackupDb {
  prepare(query: string): BackupStatement;
  /** Runs the statements in one transaction, so the tables are read at the same moment. */
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters
  batch<T>(statements: BackupStatement[]): Promise<{ results: T[] }[]>;
}

/** The part of a KV namespace binding the backup uses. */
export interface BackupStore {
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

/** A backup: every table's rows, as D1 returned them. */
export interface Backup {
  createdAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

/** Copies are kept a little over a year, then KV deletes them. */
export const KEEP_SECONDS = 400 * 24 * 60 * 60;

/**
 * Not copied: signed-in sessions and sign-in links waiting to be used (src/server/auth.ts). They
 * last weeks at most, and a copy of them would let whoever reads the backup sign in as a learner.
 * After a restore, learners sign in again.
 */
export const NOT_BACKED_UP = new Set(['session', 'verification']);

/** One key per day: a second run on the same day replaces that day's copy. */
export const backupKey = (date: Date) => `d1/${date.toISOString().slice(0, 10)}.json`;

/** The application's tables: everything but SQLite's, D1's and the migrations' own. */
export const TABLES_QUERY = `SELECT name FROM sqlite_master WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' AND name != 'd1_migrations'
  ORDER BY name`;

const sqlName = (name: string) => `"${name.replaceAll('"', '""')}"`;

export async function backupDatabase(db: BackupDb, store: BackupStore, now: Date): Promise<string> {
  const { results: all } = await db.prepare(TABLES_QUERY).all<{ name: string }>();
  const tables = all.filter(({ name }) => !NOT_BACKED_UP.has(name));
  // Table names come from sqlite_master, not from input; quoted all the same. In insertion order,
  // so a restore inserts a comment before its replies.
  const contents = await db.batch<Record<string, unknown>>(
    tables.map(({ name }) => db.prepare(`SELECT * FROM ${sqlName(name)} ORDER BY rowid`)),
  );
  const backup: Backup = {
    createdAt: now.toISOString(),
    tables: Object.fromEntries(tables.map(({ name }, i) => [name, contents[i]?.results ?? []])),
  };
  const key = backupKey(now);
  await store.put(key, JSON.stringify(backup), { expirationTtl: KEEP_SECONDS });
  return key;
}

/** D1 returns text, numbers and NULL for the columns this database has. */
const sqlValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  throw new Error(`Unexpected value in a backup: ${JSON.stringify(value)}`);
};

/**
 * A backup as SQL that replaces each table's rows with the backed-up ones, for
 * `wrangler d1 execute --file`. Tables not in the backup are left alone.
 */
export function backupToSql(backup: Backup): string {
  // Foreign keys (a reply's parent, an account's user) are checked at the end, once every row is
  // back. Every table is emptied before any is filled: emptying `user` would otherwise delete
  // (ON DELETE CASCADE) the accounts already put back.
  const lines = [`-- Backup of ${backup.createdAt}`, 'PRAGMA defer_foreign_keys = true;'];
  for (const table of Object.keys(backup.tables)) lines.push(`DELETE FROM ${sqlName(table)};`);
  for (const [table, rows] of Object.entries(backup.tables)) {
    for (const row of rows) {
      const columns = Object.keys(row).map(sqlName).join(', ');
      const values = Object.values(row).map(sqlValue).join(', ');
      lines.push(`INSERT INTO ${sqlName(table)} (${columns}) VALUES (${values});`);
    }
  }
  return `${lines.join('\n')}\n`;
}

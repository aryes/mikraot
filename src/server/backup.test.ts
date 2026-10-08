import { describe, expect, it } from 'vitest';
import { backupDatabase, backupKey, backupToSql, KEEP_SECONDS, type BackupDb } from './backup';

const rows: Record<string, Record<string, unknown>[]> = {
  comments: [
    { id: 1, author: "O'Brien", content: 'שלום', parent_id: null },
    { id: 2, author: 'דנה', content: 'שורה\nשנייה', parent_id: 1 },
  ],
  quiz_results: [],
};

const fakeDb: BackupDb = {
  prepare: (query) => ({
    // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- test double mirrors D1
    all: <T>() => {
      const table = /FROM "(\w+)"/.exec(query)?.[1];
      const results = table ? rows[table] : Object.keys(rows).map((name) => ({ name }));
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double mirrors D1
      return Promise.resolve({ results: (results ?? []) as T[] });
    },
  }),
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- test double mirrors D1
  batch: <T>(statements: { all<R>(): Promise<{ results: R[] }> }[]) =>
    Promise.all(statements.map((statement) => statement.all<T>())),
};

describe('backupDatabase', () => {
  it('writes every table to one dated key that expires after about a year', async () => {
    const puts: { key: string; value: string; ttl: number }[] = [];
    const store = {
      put: (key: string, value: string, { expirationTtl }: { expirationTtl: number }) => {
        puts.push({ key, value, ttl: expirationTtl });
        return Promise.resolve();
      },
    };
    const now = new Date('2026-10-09T02:17:00Z');
    const key = await backupDatabase(fakeDb, store, now);
    expect(key).toBe('d1/2026-10-09.json');
    expect(puts).toHaveLength(1);
    expect(puts[0]!.ttl).toBe(KEEP_SECONDS);
    expect(KEEP_SECONDS).toBeGreaterThan(365 * 24 * 60 * 60);
    expect(JSON.parse(puts[0]!.value)).toEqual({ createdAt: now.toISOString(), tables: rows });
  });

  it('names one key per day', () => {
    expect(backupKey(new Date('2026-01-02T23:59:00Z'))).toBe('d1/2026-01-02.json');
  });
});

describe('backupToSql', () => {
  it('replaces each table with its rows, replies after their comment, quoting text safely', () => {
    expect(backupToSql({ createdAt: '2026-10-09T02:17:00.000Z', tables: rows })).toBe(
      [
        '-- Backup of 2026-10-09T02:17:00.000Z',
        'PRAGMA defer_foreign_keys = true;',
        'DELETE FROM "comments";',
        `INSERT INTO "comments" ("id", "author", "content", "parent_id") VALUES (1, 'O''Brien', 'שלום', NULL);`,
        `INSERT INTO "comments" ("id", "author", "content", "parent_id") VALUES (2, 'דנה', 'שורה
שנייה', 1);`,
        'DELETE FROM "quiz_results";',
        '',
      ].join('\n'),
    );
  });
});

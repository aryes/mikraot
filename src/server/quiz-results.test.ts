import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { emptyStats, recordAnswer, recordRound, type QuizStats } from '../lib/quiz-stats';
import { MAX_DEVICES, parseUpload, syncResults, type ResultsDb, type Upload } from './quiz-results';

/** D1's interface over SQLite in memory, with the site's tables. */
function database(): ResultsDb {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const file of ['0006_accounts.sql', '0007_quiz_progress.sql']) {
    sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'));
  }
  sqlite.exec(`INSERT INTO "user" VALUES ('u', '', 'a@example.com', 1, NULL, 'now', 'now')`);
  const statement = (query: string, values: unknown[] = []) => ({
    bind: (...more: unknown[]) => statement(query, [...values, ...more]),
    // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- test double mirrors D1
    all: <T>() =>
      Promise.resolve({
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double mirrors D1
        results: sqlite.prepare(query).all(...(values as string[])) as T[],
      }),
  });
  return {
    prepare: (query) => statement(query),
    batch: async (statements) => {
      await Promise.all(statements.map((s) => s.all()));
      return [];
    },
  };
}

const DEVICE_A = 'a'.repeat(22);
const DEVICE_B = 'b'.repeat(22);
const played = (rounds: number): QuizStats => {
  let stats = emptyStats();
  for (let i = 0; i < rounds; i++) {
    stats = recordRound(recordAnswer(stats, 'tipcha', i % 2 === 0, null), 7, null);
  }
  return stats;
};
const upload = (device: string, stats: QuizStats, seen: string | null = null): Upload => ({
  device,
  quizzes: { 'trope-quiz': { stats, seen } },
  reset: [],
});

describe('parseUpload', () => {
  it("keeps only the site's quizzes and a well-formed device", () => {
    expect(parseUpload({ device: 'short' })).toEqual({ error: 'Bad device' });
    const parsed = parseUpload({
      device: DEVICE_A,
      quizzes: { 'trope-quiz': { stats: played(1), seen: null }, 'not-a-quiz': {} },
      reset: ['niqqud-quiz', 'other'],
    });
    expect(parsed).toEqual({
      device: DEVICE_A,
      quizzes: { 'trope-quiz': { stats: played(1), seen: null } },
      reset: ['niqqud-quiz'],
    });
  });
});

describe('syncResults', () => {
  const now = new Date('2026-11-18T10:00:00Z');

  it("adds up the account's devices, and sending again counts nothing twice", async () => {
    const db = database();
    await syncResults(db, 'u', upload(DEVICE_A, played(2)), now);
    await syncResults(db, 'u', upload(DEVICE_A, played(2)), now);
    const answer = await syncResults(db, 'u', upload(DEVICE_B, played(3)), now);
    expect(answer.quizzes['trope-quiz']?.others.rounds).toBe(2);
    const fromA = await syncResults(db, 'u', upload(DEVICE_A, played(4)), now);
    expect(fromA.quizzes['trope-quiz']?.others.rounds).toBe(3);
  });

  it('clears a quiz on every device; a device that had not heard of it sends nothing', async () => {
    const db = database();
    await syncResults(db, 'u', upload(DEVICE_A, played(2)), now);
    await syncResults(db, 'u', upload(DEVICE_B, played(3)), now);
    const reset = await syncResults(
      db,
      'u',
      { ...upload(DEVICE_A, emptyStats()), reset: ['trope-quiz'] },
      now,
    );
    expect(reset.quizzes['trope-quiz']).toEqual({ others: emptyStats(), reset: now.toISOString() });
    // B, which synced before, still has its old results: refused until it has seen the reset.
    const stale = await syncResults(db, 'u', upload(DEVICE_B, played(3), ''), now);
    expect(stale.quizzes['trope-quiz']?.reset).toBe(now.toISOString());
    const later = new Date('2026-11-18T11:00:00Z');
    const fromA = await syncResults(db, 'u', upload(DEVICE_A, played(1), now.toISOString()), later);
    expect(fromA.quizzes['trope-quiz']?.others.rounds).toBe(0);
    await syncResults(db, 'u', upload(DEVICE_B, played(1), now.toISOString()), later);
    const again = await syncResults(db, 'u', upload(DEVICE_A, played(1), now.toISOString()), later);
    expect(again.quizzes['trope-quiz']?.others.rounds).toBe(1);
  });

  it("takes a new device's results, played before its first sync, whatever was reset before", async () => {
    const db = database();
    await syncResults(db, 'u', { ...upload(DEVICE_A, emptyStats()), reset: ['trope-quiz'] }, now);
    const later = new Date('2026-11-18T11:00:00Z');
    await syncResults(db, 'u', upload(DEVICE_B, played(2)), later);
    const fromA = await syncResults(
      db,
      'u',
      upload(DEVICE_A, emptyStats(), now.toISOString()),
      later,
    );
    expect(fromA.quizzes['trope-quiz']?.others.rounds).toBe(2);
  });

  it(`keeps at most ${MAX_DEVICES} devices per quiz, the latest heard from`, async () => {
    const db = database();
    for (let i = 0; i < MAX_DEVICES + 2; i++) {
      // One device after another, as they would come.
      // oxlint-disable-next-line eslint/no-await-in-loop
      await syncResults(db, 'u', upload(String(i).padStart(22, 'x'), played(1)), now);
    }
    const answer = await syncResults(db, 'u', upload(DEVICE_A, emptyStats()), now);
    expect(answer.quizzes['trope-quiz']?.others.rounds).toBe(MAX_DEVICES);
  });
});

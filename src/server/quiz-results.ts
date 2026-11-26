/**
 * Quiz results kept in a learner's account (migrations/0007_quiz_progress.sql; Arye, 2026-11-18:
 * quiz results are what syncs first). A signed-in browser sends the results played on it while
 * signed in (src/lib/quiz-sync.ts) and gets back the sum of the account's other devices', which it
 * shows added to its own: each device's row is replaced, never added to, so sending again counts
 * nothing twice. Results played signed out stay in the browser, never in an account (Arye,
 * 2026-11-21: on a shared computer they may be someone else's).
 */
import { addStats, emptyStats, readStats, type QuizStats } from '../lib/quiz-stats';
import { QUIZ_STORAGE } from '../lib/quizzes';

/** A request is ten or so quizzes' results: far below this. */
export const MAX_BODY_BYTES = 200_000;
/** Answers kept per quiz (the largest quiz has a few dozen). */
const MAX_ANSWERS = 100;
/**
 * Browsers per quiz in one account: enough for anyone, and a bound on what one account stores.
 * A new one beyond it replaces the one heard from longest ago.
 */
export const MAX_DEVICES = 20;

const QUIZZES: ReadonlySet<string> = new Set(Object.values(QUIZ_STORAGE).map((q) => q.storage));
const DEVICE = /^[\w-]{22}$/;

export interface Upload {
  /** The browser's own name for itself (src/lib/quiz-sync.ts). */
  device: string;
  /**
   * Each quiz's results played in this browser while signed in, and the latest reset of it this
   * browser has seen: '' if none, null if it hasn't synced since signing in (then nothing is
   * written: the browser takes its row back first, `mine`, and sends the two added together).
   */
  quizzes: Record<string, { stats: QuizStats; seen: string | null }>;
  /** Quizzes whose results the learner just cleared, on every device. */
  reset: string[];
}

export interface Answer {
  /**
   * For each quiz the account has: this device's results as kept, the other devices', and its
   * latest reset.
   */
  quizzes: Record<string, { mine: QuizStats; others: QuizStats; reset: string | null }>;
}

const field = (value: unknown, key: string): unknown =>
  value && typeof value === 'object' ? Reflect.get(value, key) : undefined;

/** An answer's id as quizzes name them: short text. */
const knownShape = (id: string) => id.length > 0 && id.length <= 64;

/** A request's body, checked: only the site's quizzes, counts that can be. */
export function parseUpload(body: unknown): Upload | { error: string } {
  const device = field(body, 'device');
  if (typeof device !== 'string' || !DEVICE.test(device)) return { error: 'Bad device' };
  const given = field(body, 'quizzes');
  const quizzes: Upload['quizzes'] = {};
  if (given && typeof given === 'object') {
    for (const [quiz, entry] of Object.entries(given)) {
      if (!QUIZZES.has(quiz)) continue;
      const stats = readStats(field(entry, 'stats'), knownShape);
      const answers = Object.fromEntries(Object.entries(stats.answers).slice(0, MAX_ANSWERS));
      const seen = field(entry, 'seen');
      quizzes[quiz] = {
        stats: { ...stats, answers },
        seen: typeof seen === 'string' && seen.length <= 40 ? seen : null,
      };
    }
  }
  const reset = field(body, 'reset');
  return {
    device,
    quizzes,
    reset: Array.isArray(reset) ? reset.filter((q): q is string => QUIZZES.has(String(q))) : [],
  };
}

interface Statement {
  bind(...values: unknown[]): Statement;
  // Mirrors D1's API: the caller states the row type it selected.
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters
  all<T>(): Promise<{ results: T[] }>;
}

/** The part of D1 used here. */
export interface ResultsDb {
  prepare(query: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}

/** Nothing played: not stored. */
const isEmpty = (stats: QuizStats) => stats.asked === 0 && stats.rounds === 0;

/**
 * Applies a browser's request for this account: resets first, then its results (except of a
 * quiz reset since the browser last heard: it clears its own and sends them again), and answers
 * with every quiz's other devices' results.
 */
export async function syncResults(
  db: ResultsDb,
  userId: string,
  upload: Upload,
  now: Date,
): Promise<Answer> {
  const at = now.toISOString();
  const writes: Statement[] = upload.reset.flatMap((quiz) => [
    db.prepare('DELETE FROM quiz_progress WHERE user_id = ? AND quiz = ?').bind(userId, quiz),
    db
      .prepare('INSERT OR REPLACE INTO quiz_resets (user_id, quiz, reset_at) VALUES (?, ?, ?)')
      .bind(userId, quiz, at),
  ]);
  if (writes.length > 0) await db.batch(writes);

  const [{ results: rows }, { results: resetRows }] = await Promise.all([
    db
      .prepare('SELECT quiz, device, stats FROM quiz_progress WHERE user_id = ?')
      .bind(userId)
      .all<{ quiz: string; device: string; stats: string }>(),
    db
      .prepare('SELECT quiz, reset_at FROM quiz_resets WHERE user_id = ?')
      .bind(userId)
      .all<{ quiz: string; reset_at: string }>(),
  ]);
  const resets = new Map(resetRows.map((row) => [row.quiz, row.reset_at]));

  const updates: Statement[] = [];
  for (const [quiz, { stats, seen }] of Object.entries(upload.quizzes)) {
    // Just signed in: the browser takes its row back before sending anything.
    if (seen === null) continue;
    const reset = resets.get(quiz);
    // Synced before, and cleared since: the browser clears its own and sends them again.
    if (reset !== undefined && seen < reset) continue;
    const mine = rows.find((row) => row.quiz === quiz && row.device === upload.device);
    const json = JSON.stringify(stats);
    if (mine?.stats === json || (!mine && isEmpty(stats))) continue;
    const devices = rows.filter((row) => row.quiz === quiz).length;
    if (!mine && devices >= MAX_DEVICES) {
      updates.push(
        db
          .prepare(
            `DELETE FROM quiz_progress WHERE user_id = ? AND quiz = ? AND device =
             (SELECT device FROM quiz_progress WHERE user_id = ? AND quiz = ? ORDER BY updated_at LIMIT 1)`,
          )
          .bind(userId, quiz, userId, quiz),
      );
    }
    updates.push(
      db
        .prepare(
          `INSERT INTO quiz_progress (user_id, quiz, device, stats, updated_at) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (user_id, quiz, device) DO UPDATE SET stats = excluded.stats, updated_at = excluded.updated_at`,
        )
        .bind(userId, quiz, upload.device, json, at),
    );
  }
  if (updates.length > 0) await db.batch(updates);

  const quizzes: Answer['quizzes'] = {};
  for (const quiz of new Set([...rows.map((row) => row.quiz), ...resets.keys()])) {
    const sum = (mine: boolean) =>
      rows
        .filter((row) => row.quiz === quiz && (row.device === upload.device) === mine)
        .map((row) => readStats(parseJson(row.stats), knownShape))
        .reduce(addStats, emptyStats());
    quizzes[quiz] = { mine: sum(true), others: sum(false), reset: resets.get(quiz) ?? null };
  }
  return { quizzes };
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

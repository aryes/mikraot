/**
 * A learner's results over time in one quiz (Arye, 2026-11-10: "save quiz statistics for the
 * user"): rounds played, right answers, the best round, and for each answer how often it was asked
 * and missed. Kept in the browser like the level and the recent questions, and in the account
 * when signed in (src/lib/quiz-sync.ts, since 2026-11-18). Pure functions; src/components/Quiz.tsx stores and shows them.
 * Also kept apart for each time limit (Arye, 2026-11-15: rounds with different limits are results
 * of their own), for the page of all the quizzes (src/components/QuizSummary.tsx).
 */
import { TIME_LIMITS } from './quiz';

/** Rounds, answers and the best round, overall or with one time limit. */
export interface Tally {
  rounds: number;
  /** Questions answered, and answered right, in finished and unfinished rounds alike. */
  asked: number;
  right: number;
  /** The best score of a finished round, out of its size. */
  best: number;
}

export interface QuizStats extends Tally {
  /** For each answer: how often it was asked, and missed. */
  answers: Record<string, { asked: number; missed: number }>;
  /** The same tally for each time limit played (`limitKey`). */
  byLimit: Record<string, Tally>;
}

const emptyTally = (): Tally => ({ rounds: 0, asked: 0, right: 0, best: 0 });

export const emptyStats = (): QuizStats => ({ ...emptyTally(), answers: {}, byLimit: {} });

/** A time limit's key in `byLimit`: its seconds, or `none`. */
export const limitKey = (limit: number | null): string => (limit === null ? 'none' : String(limit));

/** The keys of the limits offered, longest first, no limit last: the order they are shown in. */
export const LIMIT_KEYS: readonly string[] = [...TIME_LIMITS.map(limitKey), limitKey(null)];

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0;

/**
 * Saved stats, or empty ones when there are none: checked, since storage can hold anything (an
 * old version's, or edited by hand). Only answers the quiz knows (`known`) are kept, since naming
 * an unknown one could break its start screen; counts that can't be (more right than asked) are
 * cut down.
 */
export function readStats(saved: unknown, known: (id: string) => boolean): QuizStats {
  if (!saved || typeof saved !== 'object') return emptyStats();
  const field = (name: string): unknown => Reflect.get(saved, name);
  const byLimit: unknown = field('byLimit');
  const limits =
    byLimit && typeof byLimit === 'object'
      ? Object.entries(byLimit)
          .filter(([key]) => LIMIT_KEYS.includes(key))
          .map(([key, tally]: [string, unknown]) => [key, readTally(tally)] as const)
      : [];
  const answers: unknown = field('answers');
  const entries =
    answers && typeof answers === 'object'
      ? Object.entries(answers)
          .filter(([id]) => known(id))
          .map(([id, entry]: [string, unknown]) => {
            const value = entry && typeof entry === 'object' ? entry : {};
            const asked = count(Reflect.get(value, 'asked'));
            const missed = Math.min(count(Reflect.get(value, 'missed')), asked);
            return [id, { asked, missed }] as const;
          })
      : [];
  return {
    ...readTally(saved),
    answers: Object.fromEntries(entries),
    byLimit: Object.fromEntries(limits),
  };
}

/** A saved tally, as counts that can be. */
function readTally(saved: unknown): Tally {
  if (!saved || typeof saved !== 'object') return emptyTally();
  const field = (name: string): unknown => Reflect.get(saved, name);
  const asked = count(field('asked'));
  return {
    rounds: count(field('rounds')),
    asked,
    right: Math.min(count(field('right')), asked),
    best: count(field('best')),
  };
}

/** The stats with one tally changed: the overall one and the time limit's. */
function tallied(
  stats: QuizStats,
  limit: number | null,
  change: (tally: Tally) => Tally,
): QuizStats {
  const key = limitKey(limit);
  return {
    ...stats,
    ...change(stats),
    byLimit: { ...stats.byLimit, [key]: change(stats.byLimit[key] ?? emptyTally()) },
  };
}

/** The stats after one answer, with this time limit. */
export function recordAnswer(
  stats: QuizStats,
  answer: string,
  correct: boolean,
  limit: number | null,
): QuizStats {
  const entry = stats.answers[answer] ?? { asked: 0, missed: 0 };
  return {
    ...tallied(stats, limit, (tally) => ({
      rounds: tally.rounds,
      asked: tally.asked + 1,
      right: tally.right + (correct ? 1 : 0),
      best: tally.best,
    })),
    answers: {
      ...stats.answers,
      [answer]: { asked: entry.asked + 1, missed: entry.missed + (correct ? 0 : 1) },
    },
  };
}

/** The stats after a finished round with this score and time limit. */
export const recordRound = (stats: QuizStats, score: number, limit: number | null): QuizStats =>
  tallied(stats, limit, (tally) => ({
    rounds: tally.rounds + 1,
    asked: tally.asked,
    right: tally.right,
    best: Math.max(tally.best, score),
  }));

/** Asked at least this often before an answer counts among the hardest: one miss means little. */
export const MIN_ASKED = 3;

/**
 * The answers missed most often (as a share of the times asked, then by misses), at most `limit`,
 * among those asked at least MIN_ASKED times and missed at least once.
 */
export function hardest(stats: QuizStats, limit = 3): string[] {
  return (
    Object.entries(stats.answers)
      .filter(([, { asked, missed }]) => asked >= MIN_ASKED && missed > 0)
      .map(([id, { asked, missed }]) => ({ id, share: missed / asked, missed }))
      // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array; toSorted needs Safari 16
      .sort((a, b) => b.share - a.share || b.missed - a.missed)
      .slice(0, limit)
      .map(({ id }) => id)
  );
}

/** Two tallies together: counts added, the better best. */
const addTally = (a: Tally, b: Tally): Tally => ({
  rounds: a.rounds + b.rounds,
  asked: a.asked + b.asked,
  right: a.right + b.right,
  best: Math.max(a.best, b.best),
});

/**
 * Results from two places together: this browser's and the account's other devices'
 * (src/lib/quiz-sync.ts). Each device keeps only its own, so nothing is counted twice.
 */
export function addStats(a: QuizStats, b: QuizStats): QuizStats {
  const answers = { ...a.answers };
  for (const [id, entry] of Object.entries(b.answers)) {
    const mine = answers[id] ?? { asked: 0, missed: 0 };
    answers[id] = { asked: mine.asked + entry.asked, missed: mine.missed + entry.missed };
  }
  const byLimit = { ...a.byLimit };
  for (const [key, tally] of Object.entries(b.byLimit)) {
    byLimit[key] = addTally(byLimit[key] ?? emptyTally(), tally);
  }
  return { ...addTally(a, b), answers, byLimit };
}

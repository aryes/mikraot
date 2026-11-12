/**
 * A learner's results over time in one quiz (Arye, 2026-11-10: "save quiz statistics for the
 * user"): rounds played, right answers, the best round, and for each answer how often it was asked
 * and missed. Kept in the browser like the level and the recent questions (no accounts; across
 * devices would need sign-in). Pure functions; src/components/Quiz.tsx stores and shows them.
 */

export interface QuizStats {
  rounds: number;
  /** Questions answered, and answered right, in finished and unfinished rounds alike. */
  asked: number;
  right: number;
  /** The best score of a finished round, out of its size. */
  best: number;
  /** For each answer: how often it was asked, and missed. */
  answers: Record<string, { asked: number; missed: number }>;
}

export const emptyStats = (): QuizStats => ({
  rounds: 0,
  asked: 0,
  right: 0,
  best: 0,
  answers: {},
});

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
  const asked = count(field('asked'));
  return {
    rounds: count(field('rounds')),
    asked,
    right: Math.min(count(field('right')), asked),
    best: count(field('best')),
    answers: Object.fromEntries(entries),
  };
}

/** The stats after one answer. */
export function recordAnswer(stats: QuizStats, answer: string, correct: boolean): QuizStats {
  const entry = stats.answers[answer] ?? { asked: 0, missed: 0 };
  return {
    ...stats,
    asked: stats.asked + 1,
    right: stats.right + (correct ? 1 : 0),
    answers: {
      ...stats.answers,
      [answer]: { asked: entry.asked + 1, missed: entry.missed + (correct ? 0 : 1) },
    },
  };
}

/** The stats after a finished round with this score. */
export const recordRound = (stats: QuizStats, score: number): QuizStats => ({
  ...stats,
  rounds: stats.rounds + 1,
  best: Math.max(stats.best, score),
});

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

import React from 'react';
import { LIMIT_KEYS, type QuizStats, type Tally } from '../lib/quiz-stats';

/** One time limit's results, a row of the table (Arye, 2026-11-15). */
const LimitResults: React.FC<{ limitKey: string; tally: Tally; size: number }> = ({
  limitKey,
  tally,
  size,
}) => (
  <tr>
    <td>{limitKey === 'none' ? 'בלי הגבלה' : `${limitKey} שניות`}</td>
    <td>{tally.rounds}</td>
    <td>{Math.round((100 * tally.right) / tally.asked)}%</td>
    <td>{tally.rounds > 0 ? `${Math.min(tally.best, size)} מתוך ${size}` : '–'}</td>
  </tr>
);

/** The time limits played, in LIMIT_KEYS order, each with its tally. */
export const playedLimits = (stats: QuizStats): [string, Tally][] =>
  LIMIT_KEYS.flatMap((key) => {
    const tally = stats.byLimit[key];
    return tally && tally.asked > 0 ? [[key, tally] as [string, Tally]] : [];
  });

/**
 * A quiz's results for each time limit played, one row each: rounds, the share of right answers and
 * the best round. On the page of all the quizzes and on each quiz's start screen (Arye,
 * 2026-11-16: the same table in both). Nothing if no time limit has been played (results kept
 * before 2026-11-15, when they began to be kept by time limit, don't count).
 */
export const QuizResultsTable: React.FC<{
  stats: QuizStats;
  /** Questions in a round. */
  size: number;
  /** The table's scroll area's name, for screen readers. */
  label: string;
  /** Its cells' size: smaller than the text around them (`[&_td]:text-base! [&_th]:text-base!`). */
  cells: string;
}> = ({ stats, size, label, cells }) => {
  const played = playedLimits(stats);
  if (played.length === 0) return null;
  return (
    // The content's table style, as in the lessons; its scroll area named and reachable by
    // keyboard like theirs (ContentTable.astro), and no wider than its four short columns need.
    <div className={`table-scroll my-2! max-w-lg ${cells}`} tabIndex={0} aria-label={label}>
      <table>
        <thead>
          <tr>
            <th scope="col">זמן לשאלה</th>
            <th scope="col">סבבים</th>
            <th scope="col">תשובות נכונות</th>
            <th scope="col">שיא</th>
          </tr>
        </thead>
        <tbody>
          {played.map(([key, tally]) => (
            <LimitResults key={key} limitKey={key} tally={tally} size={size} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

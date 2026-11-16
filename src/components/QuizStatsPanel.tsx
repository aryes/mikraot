import React, { useId, useState, type ReactNode } from 'react';
import { hardest, type QuizStats } from '../lib/quiz-stats';
import { playedLimits, QuizResultsTable } from './QuizResultsTable';

/**
 * A learner's results in this quiz so far (src/lib/quiz-stats.ts), on its start screen: the
 * table of the page of all the quizzes (rounds, right answers and best round for each time
 * limit; Arye, 2026-11-16), and the answers they miss most. Nothing until there is one of
 * those. Clearing them asks once more first:
 * they can't be brought back.
 */
export const QuizStatsPanel: React.FC<{
  stats: QuizStats;
  size: number;
  name: (id: string) => ReactNode;
  onReset: () => void;
}> = ({ stats, size, name, onReset }) => {
  const title = useId();
  const [confirming, setConfirming] = useState(false);
  const missed = hardest(stats);
  // Results kept before they were by time limit (2026-11-15) show no table.
  if (playedLimits(stats).length === 0 && missed.length === 0) return null;
  const link =
    'cursor-pointer rounded px-2 py-1 text-sm text-slate-600 underline hover:no-underline dark:text-slate-300';
  return (
    <section
      aria-labelledby={title}
      className="mx-auto max-w-lg space-y-1 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60"
    >
      {/* Important: the content's heading and list styles (.wp-content-rendered) would win. */}
      <h2 id={title} className="m-0! text-sm! font-bold text-inherit!">
        הנתונים שלכם
      </h2>
      <QuizResultsTable
        stats={stats}
        size={size}
        label="התוצאות שלכם בחידון הזה"
        cells="[&_td]:text-sm! [&_th]:text-sm!"
      />
      {missed.length > 0 && (
        <div>
          הכי קשים לכם:{' '}
          {missed.map((id, i) => (
            <React.Fragment key={id}>
              {i > 0 && ', '}
              <span className="font-bold">{name(id)}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      {confirming ? (
        <div>
          למחוק את כל הנתונים של החידון הזה?{' '}
          <button type="button" className={link} onClick={onReset}>
            למחוק
          </button>
          {/* The safe answer takes the focus (the button pressed has gone). */}
          <button
            type="button"
            className={link}
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- moves focus from a button that went away
            autoFocus
            onClick={() => setConfirming(false)}
          >
            לא
          </button>
        </div>
      ) : (
        <button type="button" className={link} onClick={() => setConfirming(true)}>
          לאפס את הנתונים
        </button>
      )}
    </section>
  );
};

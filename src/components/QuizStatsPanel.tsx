import React, { useId, useState, type ReactNode } from 'react';
import { hardest, type QuizStats } from '../lib/quiz-stats';

/**
 * A learner's results in this quiz so far (src/lib/quiz-stats.ts), on its start screen: rounds
 * finished, the share of right answers, the best round, and the answers they miss most; one
 * figure a line. Nothing until they have answered something. Clearing them asks once more first:
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
  if (stats.asked === 0) return null;
  const share = Math.round((100 * stats.right) / stats.asked);
  const missed = hardest(stats);
  const link =
    'cursor-pointer rounded px-2 py-1 text-sm text-slate-600 underline hover:no-underline dark:text-slate-300';
  return (
    <section
      aria-labelledby={title}
      className="mx-auto max-w-md space-y-1 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/60"
    >
      {/* Important: the content's heading and list styles (.wp-content-rendered) would win. */}
      <h3 id={title} className="m-0! text-sm! font-bold text-inherit!">
        הנתונים שלכם
      </h3>
      <ul className="m-0! list-none! space-y-0.5 p-0! [&>li]:m-0! [&>li]:text-sm! [&>li]:leading-normal!">
        <li>סבבים שהושלמו: {stats.rounds}</li>
        <li>תשובות נכונות: {share}%</li>
        {stats.rounds > 0 && (
          <li>
            הסבב הטוב ביותר: {Math.min(stats.best, size)} מתוך {size}
          </li>
        )}
        {missed.length > 0 && (
          <li>
            הכי קשים לכם:{' '}
            {missed.map((id, i) => (
              <React.Fragment key={id}>
                {i > 0 && ', '}
                <span className="font-bold">{name(id)}</span>
              </React.Fragment>
            ))}
          </li>
        )}
      </ul>
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

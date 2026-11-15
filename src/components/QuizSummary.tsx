import React, { useRef, useSyncExternalStore } from 'react';
import { MAX_LEVEL } from '../lib/quiz';
import { LIMIT_KEYS, readStats, type QuizStats, type Tally } from '../lib/quiz-stats';
import { quizKeys, savedLevel, stored } from '../lib/quiz-storage';
import type { QuizEntry } from '../lib/quizzes';

export interface QuizLink extends QuizEntry {
  title: string;
  url: string;
}

interface Remembered {
  stats: QuizStats;
  level: number;
}

const LINK = 'font-bold';
/** Before this browser's memory is read. */
const NONE: readonly Remembered[] = [];

/** What this browser remembers of one quiz (src/lib/quiz-storage.ts). */
function remembered(storage: string): Remembered {
  const keys = quizKeys(storage);
  return {
    // The answers aren't shown here: they are, on the quiz's own start screen.
    stats: readStats(stored(keys.stats), () => false),
    level: savedLevel(keys.level),
  };
}

/** One time limit's results, on a line of their own (Arye, 2026-11-15). */
const LimitResults: React.FC<{ limitKey: string; tally: Tally }> = ({ limitKey, tally }) => (
  <li>
    <span className="font-bold">
      {limitKey === 'none' ? 'בלי הגבלת זמן' : `${limitKey} שניות לשאלה`}:
    </span>{' '}
    סבבים שהושלמו: {tally.rounds} · תשובות נכונות: {Math.round((100 * tally.right) / tally.asked)}%
    {tally.rounds > 0 && (
      // Rounds are of ten (buildRound in src/lib/quiz.ts).
      <> · הסבב הטוב ביותר: {Math.min(tally.best, 10)} מתוך 10</>
    )}
  </li>
);

/** Storage changed in another tab. */
function subscribe(changed: () => void): () => void {
  addEventListener('storage', changed);
  return () => removeEventListener('storage', changed);
}

/**
 * The page of all the quizzes ("חידונים"; Arye, 2026-11-15): each one with the learner's results
 * so far, for each time limit played apart, and the level it is at: how alike the options are (the
 * level rises with right answers). Read from this browser once the page loads; before that, and for
 * a quiz not yet played, only its link. Below them, that the results stay in this browser.
 */
export const QuizSummary: React.FC<{ quizzes: readonly QuizLink[] }> = ({ quizzes }) => {
  // Read as an outside store: this browser's memory, and again if another tab changes it; the same
  // array while nothing changed, as useSyncExternalStore needs. Nothing while the page is built
  // (Preact's useSyncExternalStore has no server snapshot): the built page has only the links.
  const latest = useRef<{ key: string; value: readonly Remembered[] }>({ key: '', value: NONE });
  const memory = useSyncExternalStore(subscribe, () => {
    if (typeof window === 'undefined') return NONE;
    const value = quizzes.map(({ storage }) => remembered(storage));
    const key = JSON.stringify(value);
    if (key !== latest.current.key) latest.current = { key, value };
    return latest.current.value;
  });
  return (
    <>
      {/* Important: the content's list styles (.wp-content-rendered) would win. */}
      <ul className="m-0! flex list-none! flex-col gap-3 p-0!">
        {quizzes.map(({ title, url, levels }, i) => {
          const quiz = memory[i];
          // By its time limits: results kept before they were (2026-11-15) don't count.
          const played = quiz && Object.values(quiz.stats.byLimit).some(({ asked }) => asked > 0);
          return (
            <li key={url} className="m-0! rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <a href={encodeURI(url)} className={LINK}>
                {title}
              </a>
              {quiz &&
                (played ? (
                  <ul className="m-0! mt-1! list-none! space-y-0.5 border-0! p-0! [&>li]:m-0! [&>li]:text-sm! [&>li]:leading-normal!">
                    {LIMIT_KEYS.map((key) => {
                      const tally = quiz.stats.byLimit[key];
                      return tally && tally.asked > 0 ? (
                        <LimitResults key={key} limitKey={key} tally={tally} />
                      ) : null;
                    })}
                    {levels && (
                      <li>
                        רמת הקושי: {quiz.level + 1} מתוך {MAX_LEVEL + 1}
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="m-0! mt-1! text-sm! text-slate-600 dark:text-slate-300">
                    עוד לא שיחקתם.
                  </p>
                ))}
            </li>
          );
        })}
      </ul>
      <p className="m-0! mt-6! text-sm! text-slate-600 dark:text-slate-300">
        התוצאות נשמרות רק בדפדפן הזה.
      </p>
    </>
  );
};

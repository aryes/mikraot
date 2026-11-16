import React, { useRef, useState, useSyncExternalStore } from 'react';
import { MAX_LEVEL } from '../lib/quiz';
import { emptyStats, readStats, type QuizStats } from '../lib/quiz-stats';
import { quizKeys, savedLevel, store, stored } from '../lib/quiz-storage';
import type { QuizEntry } from '../lib/quizzes';
import { playedLimits, QuizResultsTable } from './QuizResultsTable';

export interface QuizLink extends QuizEntry {
  title: string;
  url: string;
}

interface Remembered {
  stats: QuizStats;
  level: number;
}

const LINK = 'font-bold';
/** A quiet action, as the reset on each quiz's start screen (QuizStatsPanel.tsx). */
const ACTION =
  'cursor-pointer rounded px-2 py-1 text-sm text-slate-600 underline hover:no-underline dark:text-slate-300';
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

/** Storage changed in another tab. */
function subscribe(changed: () => void): () => void {
  addEventListener('storage', changed);
  return () => removeEventListener('storage', changed);
}

/**
 * The page of all the quizzes ("חידונים"; Arye, 2026-11-15): each one with the learner's results
 * so far, for each time limit played apart, and the level it is at: how alike the options are (the
 * level rises with right answers). Read from this browser once the page loads; before that, and for
 * a quiz not yet played, only its link. Below them, that the results stay in this browser, and a
 * way to clear every quiz's results at once (Arye, 2026-11-16), asked once more first, as each
 * quiz's own reset is: the same results (not the levels or the choices made on the start screens).
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
  const [confirming, setConfirming] = useState(false);
  const [cleared, setCleared] = useState(false);
  const done = useRef<HTMLParagraphElement>(null);
  // As the tables show them: results kept before they were by time limit (2026-11-15) don't count.
  const played = memory.map(({ stats }) => playedLimits(stats).length > 0);
  const anything = played.some(Boolean);
  function clearAll(): void {
    for (const { storage } of quizzes) store(quizKeys(storage).stats, emptyStats());
    setConfirming(false);
    setCleared(true);
    // The button pressed goes away: focus to the line that says it was done (always in the page).
    done.current?.focus();
  }
  // A quiz open in another tab keeps its results in memory and saves them again with its next
  // answer: they come back here then, as the button does.
  return (
    <>
      {/* Important: the content's list styles (.wp-content-rendered) would win. */}
      <ul className="m-0! flex list-none! flex-col gap-3 p-0!">
        {quizzes.map(({ title, url, levels }, i) => {
          const quiz = memory[i];
          return (
            <li key={url} className="m-0! rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
              <a href={encodeURI(url)} className={LINK}>
                {title}
              </a>
              {quiz &&
                (played[i] ? (
                  <>
                    {/* Rounds are of ten (buildRound in src/lib/quiz.ts). */}
                    <QuizResultsTable
                      stats={quiz.stats}
                      size={10}
                      label={`התוצאות ב${title}`}
                      cells="[&_td]:text-base! [&_th]:text-base!"
                    />
                    {levels && (
                      <p className="m-0! text-sm!">
                        רמת הקושי: {quiz.level + 1} מתוך {MAX_LEVEL + 1}
                      </p>
                    )}
                  </>
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
      {/* Always in the page, its words changing, so a screen reader reads them out. Only until
          results come back (from another tab). */}
      <p role="status" tabIndex={-1} ref={done} className="m-0! mt-2! text-sm! outline-none">
        {cleared && !anything ? 'הנתונים של כל החידונים נמחקו.' : ''}
      </p>
      {anything &&
        (confirming ? (
          <p className="m-0! mt-2! text-sm!">
            למחוק את הנתונים של כל החידונים?{' '}
            <button type="button" className={ACTION} onClick={clearAll}>
              למחוק
            </button>
            {/* The safe answer takes the focus (the button pressed has gone). */}
            <button
              type="button"
              className={ACTION}
              // oxlint-disable-next-line jsx-a11y/no-autofocus -- moves focus from a button that went away
              autoFocus
              onClick={() => setConfirming(false)}
            >
              לא
            </button>
          </p>
        ) : (
          <button
            type="button"
            className={`${ACTION} -ms-2 mt-2`}
            onClick={() => {
              setCleared(false);
              setConfirming(true);
            }}
          >
            לאפס את הנתונים של כל החידונים
          </button>
        ))}
    </>
  );
};

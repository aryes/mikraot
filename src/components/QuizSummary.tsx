import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { signedInHere } from '../lib/account';
import type { QuizStats } from '../lib/quiz-stats';
import { clearResults, resultsOf, SYNCED_EVENT, syncResults } from '../lib/quiz-sync';
import { ACCOUNT_URL } from '../lib/urls';
import type { QuizEntry } from '../lib/quizzes';
import { playedLimits, QuizResultsTable } from './QuizResultsTable';

export interface QuizLink extends QuizEntry {
  title: string;
  url: string;
}

const LINK = 'font-bold';
/** A quiet action, as the reset on each quiz's start screen (QuizStatsPanel.tsx). */
const ACTION =
  'cursor-pointer rounded px-2 py-1 text-sm text-slate-600 underline hover:no-underline dark:text-slate-300';
/** Before this browser's memory is read. */
const NONE: readonly QuizStats[] = [];

/**
 * What this browser remembers of one quiz's results (src/lib/quiz-storage.ts), with the account's
 * other devices' when signed in (src/lib/quiz-sync.ts). The answers aren't shown here (they are,
 * on the quiz's own start screen), nor the options' level (Arye, 2026-11-16: not for the learner
 * to see).
 */
function remembered(storage: string): QuizStats {
  return resultsOf(storage, () => false);
}

/** Storage changed in another tab, or the account's results arrived. */
function subscribe(changed: () => void): () => void {
  addEventListener('storage', changed);
  document.addEventListener(SYNCED_EVENT, changed);
  return () => {
    removeEventListener('storage', changed);
    document.removeEventListener(SYNCED_EVENT, changed);
  };
}

/**
 * The page of all the quizzes ("חידונים"; Arye, 2026-11-15): each one's name, what it asks, and the
 * learner's results so far, for each time limit played apart. Read from this browser once the page
 * loads; before that, and for a quiz not yet played, only its link and description. Below them,
 * where the results are kept (this browser, or the account when signed in), and a way to clear every quiz's results at once (Arye,
 * 2026-11-16), asked once more first, as each quiz's own reset is: the same results (not the
 * levels or the choices made on the start screens).
 */
export const QuizSummary: React.FC<{ quizzes: readonly QuizLink[] }> = ({ quizzes }) => {
  // Read as an outside store: this browser's memory, and again if another tab changes it; the same
  // array while nothing changed, as useSyncExternalStore needs. Nothing while the page is built
  // (Preact's useSyncExternalStore has no server snapshot): the built page has only the links.
  const latest = useRef<{ key: string; value: readonly QuizStats[] }>({ key: '', value: NONE });
  const memory = useSyncExternalStore(subscribe, () => {
    if (typeof window === 'undefined') return NONE;
    const value = quizzes.map(({ storage }) => remembered(storage));
    const key = JSON.stringify(value);
    if (key !== latest.current.key) latest.current = { key, value };
    return latest.current.value;
  });
  const [confirming, setConfirming] = useState(false);
  // Known only in the browser: until then (the built page), as for a visitor not signed in.
  const account = useSyncExternalStore(subscribe, () =>
    typeof window === 'undefined' ? false : signedInHere(),
  );
  useEffect(() => void syncResults(), []);
  const [cleared, setCleared] = useState(false);
  const done = useRef<HTMLParagraphElement>(null);
  // As the tables show them: results kept before they were by time limit (2026-11-15) don't count.
  const played = memory.map((stats) => playedLimits(stats).length > 0);
  const anything = played.some(Boolean);
  function clearAll(): void {
    for (const { storage } of quizzes) {
      clearResults(storage);
    }
    // On every device of the account too.
    void syncResults(quizzes.map(({ storage }) => storage));
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
      <ul className="m-0! flex list-none! flex-col gap-2 p-0!">
        {quizzes.map(({ title, url, description }, i) => {
          const stats = memory[i];
          return (
            <li key={url} className="m-0! rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
              <a href={encodeURI(url)} className={LINK}>
                {title}
              </a>
              <p className="m-0! text-base!">{description}</p>
              {stats &&
                (played[i] ? (
                  // Rounds are of ten (buildRound in src/lib/quiz.ts).
                  <QuizResultsTable
                    stats={stats}
                    size={10}
                    label={`התוצאות ב${title}`}
                    cells="[&_td]:text-base! [&_th]:text-base!"
                  />
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
        {account ? (
          'התוצאות נשמרות בחשבון שלכם, בכל מכשיר שתתחברו ממנו.'
        ) : (
          <>
            התוצאות נשמרות רק בדפדפן הזה. כדי לשמור את התוצאות שלכם בכל מכשיר,{' '}
            <a href={ACCOUNT_URL}>התחברו לחשבון</a> לפני שאתם משחקים.
          </>
        )}
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

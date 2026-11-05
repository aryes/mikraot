import React, { useEffect, useId, useRef, useState } from 'react';
import prepared from '../data/quiz/prepared.json';
import {
  buildRound,
  chooseOptions,
  MAX_LEVEL,
  nextLevel,
  shuffle,
  type Question,
  type QuizItem,
  type WordList,
} from '../lib/trope-quiz';
import { switchNames, trope } from '../lib/tropes';
import { track } from '../scripts/analytics';

const WORD_LIST = '/quiz/trope-words.json';
/** What the browser remembers between visits. */
const RECENT_KEY = 'trope-quiz-recent';
const LEVEL_KEY = 'trope-quiz-level';
/** The questions skipped in later rounds: about ten rounds' worth. */
const RECENT_MAX = 100;

/** A saved value, or null when storage is blocked, empty or holds something else. */
function stored(key: string): unknown {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? null : JSON.parse(saved);
  } catch {
    return null;
  }
}
function store(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the quiz still works, it just doesn't remember.
  }
}
function recentKeys(): string[] {
  const saved = stored(RECENT_KEY);
  return Array.isArray(saved) ? saved.filter((key) => typeof key === 'string') : [];
}
function savedLevel(): number {
  const saved = stored(LEVEL_KEY);
  return typeof saved === 'number' && Number.isInteger(saved)
    ? Math.min(Math.max(saved, 0), MAX_LEVEL)
    : 0;
}
function isWordList(data: unknown): data is WordList {
  const items: unknown = data && typeof data === 'object' ? Reflect.get(data, 'items') : null;
  return Boolean(items) && typeof items === 'object';
}

/** A trope's name in every tradition, CSS showing the reader's (as NusachText.astro does). */
const Name: React.FC<{ id: string }> = ({ id }) => {
  const { ashkenazi, sephardi } = switchNames(id);
  if (ashkenazi === sephardi) return <>{ashkenazi}</>;
  return (
    <>
      <span className="nusach-ashkenazi">{ashkenazi}</span>
      <span className="nusach-sephardi">{sephardi}</span>
    </>
  );
};

/** Text cut into pieces, each with its place in the text as a stable key. */
function pieces(parts: string[], separator: number): { text: string; at: number; index: number }[] {
  let at = 0;
  return parts.map((text, index) => {
    const piece = { text, at, index };
    at += text.length + separator;
    return piece;
  });
}

/** An explanation, its `{id}` placeholders shown as names. */
const Why: React.FC<{ text: string }> = ({ text }) => (
  <>
    {pieces(text.split(/\{([^}]+)\}/), 1).map((piece) =>
      piece.index % 2 ? (
        <Name key={piece.at} id={piece.text} />
      ) : (
        <React.Fragment key={piece.at}>{piece.text}</React.Fragment>
      ),
    )}
  </>
);

/** The word or chain asked about, the marked word of a chain highlighted. */
const Word: React.FC<{ item: QuizItem }> = ({ item }) => {
  if (item.m === undefined) return <>{item.w}</>;
  return (
    <>
      {pieces(item.w.split('־'), 1).map((piece) => (
        <React.Fragment key={piece.at}>
          {piece.index > 0 && '־'}
          {piece.index === item.m ? (
            <span className="mark-highlight">{piece.text}</span>
          ) : (
            piece.text
          )}
        </React.Fragment>
      ))}
    </>
  );
};

const BUTTON =
  'bg-brand-strong hover:bg-brand-deep inline-flex cursor-pointer items-center justify-center rounded-xl px-5 py-2.5 text-base font-bold text-white shadow-xs transition-all';

interface Round {
  questions: Question[];
  index: number;
  /** The current question's options, chosen when it is reached (at the level of that moment). */
  options: string[];
  chosen: string | null;
  score: number;
}

const optionsFor = (question: Question | undefined, level: number) =>
  !question
    ? []
    : question.options
      ? shuffle(question.options)
      : chooseOptions(question.trope, level);

/** A new round, its questions avoiding those asked recently. */
function newRound(words: WordList, level: number): Round {
  const questions = buildRound(words, prepared, new Set(recentKeys()));
  return { questions, index: 0, options: optionsFor(questions[0], level), chosen: null, score: 0 };
}

/**
 * The trope quiz (src/lib/trope-quiz.ts): rounds of ten words from the Torah, four names to
 * choose from for each. Shown on the page "זיהוי טעמים" through the Markdoc tag `trope-quiz`.
 */
export const TropeQuiz: React.FC = () => {
  const prompt = useId();
  const [list, setList] = useState<WordList | null>(null);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState<Round | null>(null);
  const [progress, setProgress] = useState({ level: 0, streak: 0 });
  const next = useRef<HTMLButtonElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLDivElement>(null);
  /** Whether the learner has started: only then does focus follow the quiz. */
  const moved = useRef(false);

  useEffect(() => {
    fetch(WORD_LIST)
      .then((res) => {
        if (!res.ok) throw new Error(`${WORD_LIST}: ${res.status}`);
        return res.json();
      })
      .then((data: unknown) => {
        if (!isWordList(data)) throw new Error(`${WORD_LIST}: not a word list`);
        const level = savedLevel();
        setList(data);
        setProgress({ level, streak: 0 });
        setRound(newRound(data, level));
      })
      .catch(() => setFailed(true));
  }, []);

  const question = round?.questions[round.index];

  // The button that was pressed goes away, so focus moves on: after an answer to the button to
  // go on; to the next word (where reading starts), or to the score once the round is over. Not
  // on the first load, which nobody asked for.
  useEffect(() => {
    if (!round || !moved.current) return;
    if (round.chosen) next.current?.focus();
    else if (round.index < round.questions.length) word.current?.focus();
    else result.current?.focus();
  }, [round]);

  function answer(id: string): void {
    if (!round || !question || round.chosen) return;
    const correct = id === question.trope;
    moved.current = true;
    setRound({ ...round, chosen: id, score: round.score + (correct ? 1 : 0) });
    const updated = nextLevel(progress.level, progress.streak, correct);
    setProgress(updated);
    store(LEVEL_KEY, updated.level);
    store(RECENT_KEY, [...recentKeys(), question.key].slice(-RECENT_MAX));
  }

  function goOn(): void {
    if (!round) return;
    const following = round.index + 1;
    if (following >= round.questions.length) track('trope-quiz', { score: String(round.score) });
    setRound({
      ...round,
      index: following,
      options: optionsFor(round.questions[following], progress.level),
      chosen: null,
    });
  }

  if (failed) return <p role="alert">החידון לא נטען. רעננו את העמוד ונסו שוב.</p>;
  if (!list || !round) return <p>החידון נטען…</p>;

  // Divs where a size is set: the content's paragraph style (.wp-content-rendered p) would win.
  if (!question) {
    return (
      <div className="not-prose rounded-2xl border border-slate-200 p-6 text-center dark:border-slate-700">
        <div ref={result} tabIndex={-1} className="text-xl font-bold outline-none" role="status">
          זיהיתם נכון {round.score} מתוך {round.questions.length}
        </div>
        <button
          type="button"
          className={`${BUTTON} mt-4`}
          onClick={() => setRound(newRound(list, progress.level))}
        >
          סבב נוסף
        </button>
      </div>
    );
  }

  const { chosen } = round;
  return (
    <div className="not-prose rounded-2xl border border-slate-200 p-6 dark:border-slate-700">
      <div className="text-center text-sm text-(--text-faint)">
        שאלה {round.index + 1} מתוך {round.questions.length}
      </div>
      <div id={prompt} className="mt-1 text-center text-lg">
        {question.item.m === undefined ? 'איזה טעם יש כאן?' : 'איזה טעם יש במילה המסומנת?'}
      </div>
      <div
        ref={word}
        // The question is read with the word, which takes the focus after it.
        aria-describedby={prompt}
        tabIndex={-1}
        className="my-6 text-center text-5xl leading-[1.6] outline-none"
      >
        <Word item={question.item} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {round.options.map((id) => {
          const state = !chosen
            ? 'border-slate-300 hover:border-brand-strong hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800'
            : id === question.trope
              ? 'border-green-700 bg-green-50 dark:border-green-400 dark:bg-green-950/40'
              : id === chosen
                ? 'border-red-700 bg-red-50 dark:border-red-400 dark:bg-red-950/40'
                : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400';
          return (
            <button
              key={id}
              type="button"
              aria-disabled={chosen ? true : undefined}
              onClick={() => answer(id)}
              className={`cursor-pointer rounded-xl border-2 px-3 py-3 text-xl transition-colors ${state}`}
            >
              <Name id={id} />
            </button>
          );
        })}
      </div>
      {/* No full stop after a name: some end in a colon (סוף פסוק). The link takes the
          content's link style (.wp-content-rendered a). */}
      <div aria-live="polite" className="mt-4 min-h-6 space-y-2">
        {chosen && (
          <>
            <p className="font-bold">
              {chosen === question.trope ? (
                'נכון!'
              ) : (
                <>
                  לא נכון. הטעם כאן: <Name id={question.trope} />
                </>
              )}
            </p>
            {question.why && (
              <p>
                <Why text={question.why} />
              </p>
            )}
            <p>
              <a href={encodeURI(trope(question.trope).href)}>
                לדף הטעם <Name id={question.trope} />
              </a>
            </p>
          </>
        )}
      </div>
      {chosen && (
        <button ref={next} type="button" className={`${BUTTON} mt-6`} onClick={goOn}>
          {round.index + 1 < round.questions.length ? 'לשאלה הבאה' : 'לתוצאה'}
        </button>
      )}
    </div>
  );
};

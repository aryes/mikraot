import { Check, Flame, X } from 'lucide-react';
import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  buildRound,
  cheer,
  chooseOptions,
  MAX_LEVEL,
  nextLevel,
  pickStreakLabel,
  shuffle,
  TIME_LIMITS,
  TIME_UP,
  type PreparedQuestion,
  type Question,
  type QuizItem,
  type QuizKind,
  type WordList,
} from '../lib/quiz';
import { track } from '../scripts/analytics';

/** What makes one quiz differ from another: TropeQuiz.tsx, NiqqudQuiz.tsx. */
export interface QuizConfig {
  kind: QuizKind;
  /** Its word list, fetched when the quiz opens. */
  wordList: string;
  prepared: readonly PreparedQuestion[];
  /** Prepared questions in each round of ten. */
  preparedCount: number;
  /** What the browser remembers is stored under keys starting with it. */
  storage: string;
  /** The event a finished round is counted as (analytics). */
  event: string;
  /** What the learner is asked about the word. */
  prompt: (question: Question) => string;
  /** An answer's name: in an option's button (`option`), or in the feedback. */
  name: (id: string, question: Question, option: boolean) => ReactNode;
  /** The feedback's words before the right answer's name ("הטעם כאן:"). */
  answerIs: string;
  /** The explanation of a prepared question, its `{id}` placeholders shown as names. */
  why?: (text: string) => ReactNode;
  /** The feedback's last line: a link to learn more about the answer. */
  more: (question: Question) => ReactNode;
  /** A line or two under the score, after a round (the trope quiz's rank). */
  result?: (score: number, size: number) => ReactNode;
}

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
function recentKeys(key: string): string[] {
  const saved = stored(key);
  return Array.isArray(saved) ? saved.filter((item) => typeof item === 'string') : [];
}
function savedLevel(key: string): number {
  const saved = stored(key);
  return typeof saved === 'number' && Number.isInteger(saved)
    ? Math.min(Math.max(saved, 0), MAX_LEVEL)
    : 0;
}
function isWordList(data: unknown): data is WordList {
  const items: unknown = data && typeof data === 'object' ? Reflect.get(data, 'items') : null;
  return Boolean(items) && typeof items === 'object';
}

/** Text cut into pieces, each with its place in the text as a stable key. */
export function pieces(
  parts: string[],
  separator: number,
): { text: string; at: number; index: number }[] {
  let at = 0;
  return parts.map((text, index) => {
    const piece = { text, at, index };
    at += text.length + separator;
    return piece;
  });
}

/** Text whose ׀ is a פסק, drawn hollow (global.css, mark-paseq). */
const WithPaseq: React.FC<{ text: string }> = ({ text }) => (
  <>
    {pieces(text.split('׀'), 1).map((piece) => (
      <React.Fragment key={piece.at}>
        {piece.index > 0 && <span className="mark-paseq">׀</span>}
        {piece.text}
      </React.Fragment>
    ))}
  </>
);

/** The word or chain asked about, the marked word of a chain or the marked letters highlighted. */
const Word: React.FC<{ item: QuizItem }> = ({ item }) => {
  if (item.p) return <WithPaseq text={item.w} />;
  if (item.h) {
    const [start = 0, end = 0] = item.h;
    return (
      <>
        {item.w.slice(0, start)}
        <span className="mark-highlight">{item.w.slice(start, end)}</span>
        {item.w.slice(end)}
      </>
    );
  }
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

/** A secondary action, quieter than BUTTON. */
const QUIET =
  'cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';
const BUTTON =
  'bg-brand-strong hover:bg-brand-deep inline-flex cursor-pointer items-center justify-center rounded-xl px-5 py-2.5 text-base font-bold text-white shadow-xs transition-all';

interface Round {
  questions: Question[];
  index: number;
  /** The current question's options, chosen when it is reached (at the level of that moment). */
  options: string[];
  chosen: string | null;
  score: number;
  /** Right answers in a row, shown from three on. */
  run: number;
  /** How this round words the run ("רצף של 3"). */
  streakLabel: (run: number) => string;
  /** The feedback's first words (cheer). */
  cheer: string;
  /** When the current question was shown: a time limit counts from it. */
  startedAt: number;
}

/**
 * The quiz's start: the time limit for each question, none or one of TIME_LIMITS, for the whole
 * quiz (Arye, 2026-11-10). Pressed/unpressed buttons: the choice shows at once.
 */
const TimeLimitPicker: React.FC<{
  limit: number | null;
  onChange: (limit: number | null) => void;
}> = ({ limit, onChange }) => {
  const option = (value: number | null) =>
    `cursor-pointer rounded-lg px-3 py-1.5 ${
      value === limit
        ? 'bg-brand-strong font-bold text-white'
        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
    }`;
  return (
    <div
      role="group"
      aria-label="זמן לכל שאלה"
      // Two by two on phones, one row from sm.
      className="inline-grid grid-cols-2 gap-1 rounded-xl border border-slate-200 p-1 sm:inline-flex dark:border-slate-700"
    >
      {[null, ...TIME_LIMITS].map((value) => (
        <button
          key={value ?? 'none'}
          type="button"
          aria-pressed={value === limit}
          className={option(value)}
          onClick={() => onChange(value)}
        >
          {value === null ? 'בלי הגבלת זמן' : `${value} שניות`}
        </button>
      ))}
    </div>
  );
};

/** The countdown ring's radius and length, in the SVG's units (a 64-unit square). */
const RING_RADIUS = 29;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * The clock of a timed question (Arye, 2026-11-10): a ring that empties as the time runs out,
 * with the seconds left inside it, red for the last three; no clock icon (Arye: the ring says
 * it). Drawn here, not with react-countdown-circle-timer, which Arye pointed to: that package has
 * had no release since March 2023, and would add its own animation loop beside the quiz's clock,
 * for a ring that takes a few lines of SVG.
 */
const Countdown: React.FC<{ left: number; share: number; hidden: boolean }> = ({
  left,
  share,
  hidden,
}) => {
  const urgent = left <= 3;
  return (
    // Not read aloud each second: the time limit was chosen, and is shown. Hidden, not removed,
    // once answered, so the row keeps its height and the word doesn't move.
    <span
      role="timer"
      aria-label={`${left} שניות`}
      className={`relative inline-flex size-16 items-center justify-center ${
        urgent ? 'text-red-700 dark:text-red-400' : ''
      } ${hidden ? 'invisible' : ''}`}
    >
      <svg viewBox="0 0 64 64" aria-hidden="true" className="absolute inset-0 -rotate-90">
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="4"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        {/* Updated four times a second; the transition smooths the steps between (and refills
            the ring quickly when the next question starts). */}
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={RING_LENGTH * (1 - share)}
          className={`transition-[stroke-dashoffset] duration-250 ease-linear motion-reduce:transition-none ${
            urgent ? 'stroke-current' : 'stroke-brand-strong dark:stroke-brand-light'
          }`}
        />
      </svg>
      <span className="relative text-2xl leading-none font-bold tabular-nums">{left}</span>
    </span>
  );
};

/** Confetti for a perfect round, loaded only then (canvas-confetti, about 6 KB). */
function celebrate(): void {
  import('canvas-confetti')
    .then(({ default: confetti }) =>
      // Its own canvas drawn on the page, not in a Web Worker, which the CSP doesn't allow;
      // nothing for those whose system asks for less motion.
      confetti.create(undefined, { resize: true, useWorker: false, disableForReducedMotion: true })(
        { particleCount: 150, spread: 80, origin: { y: 0.6 } },
      ),
    )
    .catch(() => {
      // No confetti: the score says it all.
    });
}

/** Where the browser keeps what a quiz remembers. */
const keysOf = (config: QuizConfig) => ({
  recent: `${config.storage}-recent`,
  level: `${config.storage}-level`,
  time: `${config.storage}-time-limit`,
});

const optionsFor = (config: QuizConfig, question: Question | undefined, level: number) =>
  !question
    ? []
    : question.options
      ? shuffle(question.options)
      : chooseOptions(config.kind, question.answer, level);

/** A new round, its questions avoiding those asked recently. */
function newRound(config: QuizConfig, words: WordList, level: number): Round {
  const questions = buildRound(words, config.prepared, new Set(recentKeys(keysOf(config).recent)), {
    preparedCount: config.preparedCount,
  });
  return {
    questions,
    index: 0,
    options: optionsFor(config, questions[0], level),
    chosen: null,
    score: 0,
    run: 0,
    streakLabel: pickStreakLabel(),
    cheer: '',
    startedAt: Date.now(),
  };
}

/**
 * A quiz (src/lib/quiz.ts): rounds of ten words from the Torah, four names to choose from for
 * each. What it asks about comes from its `config`.
 */
export const Quiz: React.FC<{ config: QuizConfig }> = ({ config }) => {
  const keys = keysOf(config);
  const prompt = useId();
  const [list, setList] = useState<WordList | null>(null);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState<Round | null>(null);
  const [progress, setProgress] = useState({ level: 0, streak: 0 });
  /** Seconds for each question, or none (Arye, 2026-11-10: chosen at the start, for the quiz). */
  const [limit, setLimit] = useState<number | null>(null);
  /** Whether the learner pressed "להתחיל": until then, the time limit is chosen. */
  const [started, setStarted] = useState(false);
  /** The time now, kept while a timed question runs, for its clock. */
  const [now, setNow] = useState(() => Date.now());
  const next = useRef<HTMLButtonElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const begin = useRef<HTMLButtonElement>(null);
  /** Whether the learner has started: only then does focus follow the quiz. */
  const moved = useRef(false);

  useEffect(() => {
    fetch(config.wordList)
      .then((res) => {
        if (!res.ok) throw new Error(`${config.wordList}: ${res.status}`);
        return res.json();
      })
      .then((data: unknown) => {
        if (!isWordList(data)) throw new Error(`${config.wordList}: not a word list`);
        const level = savedLevel(keysOf(config).level);
        const savedLimit = stored(keysOf(config).time);
        setList(data);
        setProgress({ level, streak: 0 });
        setLimit(TIME_LIMITS.find((value) => value === savedLimit) ?? null);
        setRound(newRound(config, data, level));
      })
      .catch(() => setFailed(true));
  }, [config]);

  const question = round?.questions[round.index];

  // The button that was pressed goes away, so focus moves on: after an answer to the button to
  // go on; to the next word (where reading starts), or to the score once the round is over. Not
  // on the first load, which nobody asked for.
  useEffect(() => {
    if (!round || !moved.current) return;
    // Back at the start: to the button that starts again.
    if (!started) {
      begin.current?.focus();
      return;
    }
    // A time-out leaves focus where the learner is (the result is announced): not moved for them.
    if (round.chosen === TIME_UP) return;
    if (round.chosen) next.current?.focus();
    else if (round.index < round.questions.length) word.current?.focus();
    else result.current?.focus();
  }, [round, started]);

  function chooseLimit(value: number | null): void {
    setLimit(value);
    store(keys.time, value);
  }

  function start(): void {
    if (!round) return;
    moved.current = true;
    setStarted(true);
    // The first question's clock runs from now, not from when the page loaded.
    setRound({ ...round, startedAt: Date.now() });
  }

  /** Back to the start (Arye, 2026-11-10: a way to restart or quit): the round is dropped. */
  function restart(): void {
    if (!list) return;
    setStarted(false);
    setRound(newRound(config, list, progress.level));
  }

  function answer(id: string): void {
    if (!round || !question || round.chosen) return;
    const correct = id === question.answer;
    moved.current = true;
    setRound({
      ...round,
      chosen: id,
      score: round.score + (correct ? 1 : 0),
      // A mistake starts the count again, without saying so.
      run: correct ? round.run + 1 : 0,
      cheer: cheer(config.kind, question.answer, id),
    });
    const updated = nextLevel(progress.level, progress.streak, correct);
    setProgress(updated);
    store(keys.level, updated.level);
    store(keys.recent, [...recentKeys(keys.recent), question.key].slice(-RECENT_MAX));
  }

  // The clock of a timed quiz: when it runs out, the question counts as wrong. Counted from the
  // question's start, so a slow tab doesn't stretch it.
  const seconds = limit ?? 0;
  const asking = limit !== null && started && question !== undefined && !round?.chosen;
  const deadline = (round?.startedAt ?? 0) + seconds * 1000;
  useEffect(() => {
    if (!asking) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 250);
    const out = setTimeout(() => answer(TIME_UP), deadline - Date.now());
    return () => {
      clearInterval(tick);
      clearTimeout(out);
    };
  });
  const left = Math.min(seconds, Math.max(0, Math.ceil((deadline - now) / 1000)));

  function goOn(): void {
    if (!round) return;
    const following = round.index + 1;
    if (following >= round.questions.length) {
      track(config.event, {
        score: String(round.score),
        seconds: limit === null ? 'none' : String(limit),
      });
      if (round.score === round.questions.length) celebrate();
    }
    setRound({
      ...round,
      index: following,
      options: optionsFor(config, round.questions[following], progress.level),
      chosen: null,
      startedAt: Date.now(),
    });
  }

  if (failed) return <p role="alert">החידון לא נטען. רעננו את העמוד ונסו שוב.</p>;
  if (!list || !round) return <p>החידון נטען…</p>;

  // Divs where a size is set: the content's paragraph style (.wp-content-rendered p) would win.
  if (!question) {
    return (
      <div className="not-prose rounded-2xl border border-slate-200 p-6 text-center dark:border-slate-700">
        <div ref={result} tabIndex={-1} className="space-y-2 outline-none" role="status">
          <div className="text-xl font-bold">
            זיהיתם נכון {round.score} מתוך {round.questions.length}
          </div>
          {config.result?.(round.score, round.questions.length)}
        </div>
        <button
          type="button"
          className={`${BUTTON} mt-4`}
          onClick={() => setRound(newRound(config, list, progress.level))}
        >
          סבב נוסף
        </button>
        <div>
          <button type="button" className={`${QUIET} mt-3`} onClick={restart}>
            לחזור להתחלה
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="not-prose space-y-4 rounded-2xl border border-slate-200 p-6 text-center dark:border-slate-700">
        <div className="text-lg">זמן לכל שאלה:</div>
        <TimeLimitPicker limit={limit} onChange={chooseLimit} />
        <div>
          <button ref={begin} type="button" className={BUTTON} onClick={start}>
            להתחיל
          </button>
        </div>
      </div>
    );
  }

  const { chosen } = round;
  return (
    <div className="not-prose rounded-2xl border border-slate-200 p-6 dark:border-slate-700">
      {/* Three columns (Arye, 2026-11-10): the clock in the top right corner, the question's
          number in the middle, the streak in the top left corner. */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          {limit !== null && (
            <Countdown
              left={left}
              share={Math.max(0, Math.min(1, (deadline - now) / (seconds * 1000)))}
              hidden={chosen !== null}
            />
          )}
        </div>
        <div className="text-sm text-(--text-faint)">
          שאלה {round.index + 1} מתוך {round.questions.length}
        </div>
        {/* The words under the flame. Hidden, not removed, below three, so the row keeps its
            height (without a clock, the streak is its tallest) and the word doesn't move; on one
            line, so a longer label widens its column (moving the question's number a little off
            centre on a phone) rather than adding a line. */}
        <div
          className={`flex flex-col items-center justify-self-end text-center text-sm font-bold whitespace-nowrap ${
            round.run >= 3 ? '' : 'invisible'
          }`}
        >
          <Flame size={24} aria-hidden="true" className="shrink-0" />
          {round.streakLabel(Math.max(round.run, 3))}
        </div>
      </div>
      <div id={prompt} className="mt-1 text-center text-lg">
        {config.prompt(question)}
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
            : id === question.answer
              ? 'quiz-pop border-green-700 bg-green-50 dark:border-green-400 dark:bg-green-950/40'
              : id === chosen
                ? 'quiz-shake border-red-700 bg-red-50 dark:border-red-400 dark:bg-red-950/40'
                : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400';
          // An icon as well as the colour, for those who can't tell green from red.
          const Icon = !chosen ? null : id === question.answer ? Check : id === chosen ? X : null;
          return (
            <button
              key={id}
              type="button"
              aria-disabled={chosen ? true : undefined}
              onClick={() => answer(id)}
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-xl transition-colors ${state}`}
            >
              {Icon && <Icon size={18} aria-hidden="true" className="shrink-0" />}
              <span>{config.name(id, question, true)}</span>
            </button>
          );
        })}
      </div>
      {/* No full stop after a name: it may end in a colon (the trope quiz's סוף פסוק). */}
      <div aria-live="polite" className="mt-4 min-h-6 space-y-2">
        {chosen && (
          <>
            <p className="font-bold">
              {chosen === question.answer ? (
                round.cheer
              ) : (
                <>
                  {round.cheer} {config.answerIs} {config.name(question.answer, question, false)}
                </>
              )}
            </p>
            {question.why && config.why && <p>{config.why(question.why)}</p>}
            <p>{config.more(question)}</p>
          </>
        )}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {chosen ? (
          <button ref={next} type="button" className={BUTTON} onClick={goOn}>
            {round.index + 1 < round.questions.length ? 'לשאלה הבאה' : 'לתוצאה'}
          </button>
        ) : (
          <span />
        )}
        <button type="button" className={QUIET} onClick={restart}>
          לחזור להתחלה
        </button>
      </div>
    </div>
  );
};

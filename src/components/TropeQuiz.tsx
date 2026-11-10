import { Check, Flame, Timer, X } from 'lucide-react';
import React, { useEffect, useId, useRef, useState } from 'react';
import prepared from '../data/quiz/prepared.json';
import {
  buildRound,
  cheer,
  chooseOptions,
  MAX_LEVEL,
  nextLevel,
  pickStreakLabel,
  rankOf,
  shuffle,
  TIME_LIMIT,
  TIME_UP,
  type Question,
  type QuizItem,
  type WordList,
} from '../lib/trope-quiz';
import { PASEQ, switchNames, trope, unmarkedName } from '../lib/tropes';
import { track } from '../scripts/analytics';

const WORD_LIST = '/quiz/trope-words.json';
/** The page whose sections the ranks are named after. */
const HIERARCHY = '/trope-hierarchy/';
/** What the browser remembers between visits. */
const RECENT_KEY = 'trope-quiz-recent';
const LEVEL_KEY = 'trope-quiz-level';
const MODE_KEY = 'trope-quiz-challenge';
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

/**
 * A trope's name in every tradition, CSS showing the reader's (as NusachText.astro does); with
 * its sign on it unless `unmarked`.
 */
const Name: React.FC<{ id: string; unmarked?: boolean | undefined }> = ({ id, unmarked }) => {
  const { ashkenazi, sephardi } = switchNames(id, unmarked ? unmarkedName : undefined);
  if (ashkenazi === sephardi) return <>{ashkenazi}</>;
  return (
    <>
      <span className="nusach-ashkenazi">{ashkenazi}</span>
      <span className="nusach-sephardi">{sephardi}</span>
    </>
  );
};

/**
 * An option's name, and the right answer's in the feedback. Where the word's line is a פסק, the
 * answer says so ("מונח עם פסיק"; Arye, 2026-11-09): the trope alone would leave the line
 * unexplained. The פסק without its line, so it can't be read as a מונח לגרמיה's.
 */
const AnswerName: React.FC<{ id: string; question: Question; unmarked?: boolean | undefined }> = ({
  id,
  question,
  unmarked,
}) => (
  <>
    <Name id={id} unmarked={unmarked} />
    {question.item.p && id === question.trope && (
      <>
        {' עם '}
        <Name id={PASEQ} unmarked />
      </>
    )}
  </>
);

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

/** The word or chain asked about, the marked word of a chain highlighted. */
const Word: React.FC<{ item: QuizItem }> = ({ item }) => {
  if (item.p) return <WithPaseq text={item.w} />;
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
  /** Right answers in a row, shown from three on. */
  run: number;
  /** How this round words the run ("רצף של 3"). */
  streakLabel: (run: number) => string;
  /** The feedback's first words (cheer). */
  cheer: string;
  /**
   * When the current question was shown (a challenge round's clock counts from it); null until
   * the learner starts a challenge round opened on arrival, so the clock doesn't run unseen.
   */
  startedAt: number | null;
}

/**
 * Plain rounds or challenge rounds, offered between rounds. Two pressed/unpressed buttons: a
 * choice that applies at once.
 */
const ModeSwitch: React.FC<{ challenge: boolean; onChange: (challenge: boolean) => void }> = ({
  challenge,
  onChange,
}) => {
  const option = (on: boolean) =>
    `cursor-pointer rounded-lg px-3 py-1 ${
      on === challenge
        ? 'bg-brand-strong font-bold text-white'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
    }`;
  return (
    <div className="mb-4 text-center text-sm">
      <div
        role="group"
        aria-label="רמת החידון"
        className="inline-flex gap-1 rounded-xl border border-slate-200 p-1 dark:border-slate-700"
      >
        <button
          type="button"
          aria-pressed={!challenge}
          className={option(false)}
          onClick={() => onChange(false)}
        >
          רגילה
        </button>
        <button
          type="button"
          aria-pressed={challenge}
          className={option(true)}
          onClick={() => onChange(true)}
        >
          אתגר
        </button>
      </div>
      {challenge && (
        <div className="mt-1 text-(--text-faint)">
          כל הטעמים הנדירים, ו־{TIME_LIMIT} שניות לכל שאלה
        </div>
      )}
    </div>
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

const optionsFor = (question: Question | undefined, level: number) =>
  !question
    ? []
    : question.options
      ? shuffle(question.options)
      : chooseOptions(question.trope, level);

/** A new round, its questions avoiding those asked recently. */
function newRound(words: WordList, level: number, challenge: boolean, waiting = false): Round {
  const questions = buildRound(words, prepared, new Set(recentKeys()), { challenge });
  return {
    questions,
    index: 0,
    options: optionsFor(questions[0], level),
    chosen: null,
    score: 0,
    run: 0,
    streakLabel: pickStreakLabel(),
    cheer: '',
    startedAt: waiting ? null : Date.now(),
  };
}

/**
 * The trope quiz (src/lib/trope-quiz.ts): rounds of ten words from the Torah, four names to
 * choose from for each. Shown on the page "מה הטעם?" through the Markdoc tag `trope-quiz`.
 */
export const TropeQuiz: React.FC = () => {
  const prompt = useId();
  const [list, setList] = useState<WordList | null>(null);
  const [failed, setFailed] = useState(false);
  const [round, setRound] = useState<Round | null>(null);
  const [progress, setProgress] = useState({ level: 0, streak: 0 });
  /** A challenge round: every rare trope, and a time limit (Arye, 2026-11-08). */
  const [challenge, setChallenge] = useState(false);
  /** The time now, kept while a challenge question runs, for its clock. */
  const [now, setNow] = useState(() => Date.now());
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
        const savedChallenge = stored(MODE_KEY) === true;
        setList(data);
        setProgress({ level, streak: 0 });
        setChallenge(savedChallenge);
        setRound(newRound(data, level, savedChallenge, savedChallenge));
      })
      .catch(() => setFailed(true));
  }, []);

  const question = round?.questions[round.index];

  // The button that was pressed goes away, so focus moves on: after an answer to the button to
  // go on; to the next word (where reading starts), or to the score once the round is over. Not
  // on the first load, which nobody asked for.
  useEffect(() => {
    if (!round || !moved.current) return;
    // A time-out leaves focus where the learner is (the result is announced): not moved for them.
    if (round.chosen === TIME_UP) return;
    if (round.chosen) next.current?.focus();
    else if (round.index < round.questions.length) word.current?.focus();
    else result.current?.focus();
  }, [round]);

  /** Between rounds (before the first answer, or at the score): plain or challenge. */
  function chooseMode(on: boolean): void {
    if (!list || !round || on === challenge) return;
    setChallenge(on);
    store(MODE_KEY, on);
    // At the score, the choice waits for "סבב נוסף"; at a round's start, a new round of that
    // kind, which in a challenge waits for "להתחיל" before its clock runs.
    if (round.index < round.questions.length) setRound(newRound(list, progress.level, on, on));
  }

  function answer(id: string): void {
    if (!round || !question || round.chosen) return;
    const correct = id === question.trope;
    moved.current = true;
    setRound({
      ...round,
      chosen: id,
      score: round.score + (correct ? 1 : 0),
      // A mistake starts the count again, without saying so.
      run: correct ? round.run + 1 : 0,
      cheer: cheer(question.trope, id),
    });
    const updated = nextLevel(progress.level, progress.streak, correct);
    setProgress(updated);
    store(LEVEL_KEY, updated.level);
    store(RECENT_KEY, [...recentKeys(), question.key].slice(-RECENT_MAX));
  }

  // The clock of a challenge round: when it runs out, the question counts as wrong. Counted
  // from the question's start, so a slow tab doesn't stretch it.
  const asking =
    challenge &&
    question !== undefined &&
    !round?.chosen &&
    round?.startedAt !== null &&
    round?.startedAt !== undefined;
  const deadline = (round?.startedAt ?? 0) + TIME_LIMIT * 1000;
  useEffect(() => {
    if (!asking) return undefined;
    const tick = setInterval(() => setNow(Date.now()), 250);
    const out = setTimeout(() => answer(TIME_UP), deadline - Date.now());
    return () => {
      clearInterval(tick);
      clearTimeout(out);
    };
  });
  const left = Math.min(TIME_LIMIT, Math.max(0, Math.ceil((deadline - now) / 1000)));

  function goOn(): void {
    if (!round) return;
    const following = round.index + 1;
    if (following >= round.questions.length) {
      track('trope-quiz', { score: String(round.score), mode: challenge ? 'challenge' : 'plain' });
      if (round.score === round.questions.length) celebrate();
    }
    setRound({
      ...round,
      index: following,
      options: optionsFor(round.questions[following], progress.level),
      chosen: null,
      startedAt: Date.now(),
    });
  }

  if (failed) return <p role="alert">החידון לא נטען. רעננו את העמוד ונסו שוב.</p>;
  if (!list || !round) return <p>החידון נטען…</p>;

  // Divs where a size is set: the content's paragraph style (.wp-content-rendered p) would win.
  if (!question) {
    const rank = rankOf(round.score, round.questions.length);
    return (
      <div className="not-prose rounded-2xl border border-slate-200 p-6 text-center dark:border-slate-700">
        <div ref={result} tabIndex={-1} className="space-y-2 outline-none" role="status">
          <div className="text-xl font-bold">
            זיהיתם נכון {round.score} מתוך {round.questions.length}
          </div>
          {/* The rank links to its place in the trope hierarchy: the score teaches too. */}
          <div className="text-lg">
            הדרגה שלכם:{' '}
            <a href={`${HIERARCHY}#${rank.anchor}`} className="font-bold">
              {rank.name}
            </a>
          </div>
          <div>{rank.line}</div>
        </div>
        <button
          type="button"
          className={`${BUTTON} mt-4`}
          onClick={() => setRound(newRound(list, progress.level, challenge))}
        >
          סבב נוסף
        </button>
        <div className="mt-6">
          <ModeSwitch challenge={challenge} onChange={chooseMode} />
        </div>
      </div>
    );
  }

  const { chosen } = round;
  return (
    <div className="not-prose rounded-2xl border border-slate-200 p-6 dark:border-slate-700">
      {round.index === 0 && !chosen && <ModeSwitch challenge={challenge} onChange={chooseMode} />}
      <div className="flex justify-center gap-3 text-sm">
        <span className="text-(--text-faint)">
          שאלה {round.index + 1} מתוך {round.questions.length}
        </span>
        {challenge && !chosen && round.startedAt !== null && (
          // Not read aloud each second: the time limit was chosen, and is shown.
          <span
            role="timer"
            aria-label={`${left} שניות`}
            className="inline-flex items-center gap-1 font-bold tabular-nums"
          >
            <Timer size={14} aria-hidden="true" />
            {left}
          </span>
        )}
        {round.run >= 3 && (
          <span className="inline-flex items-center gap-1 font-bold">
            <Flame size={14} aria-hidden="true" />
            {round.streakLabel(round.run)}
          </span>
        )}
      </div>
      <div id={prompt} className="mt-1 text-center text-lg">
        {question.item.m === undefined ? 'איזה טעם מופיע כאן?' : 'איזה טעם מופיע במילה המסומנת?'}
      </div>
      <div
        ref={word}
        // The question is read with the word, which takes the focus after it.
        aria-describedby={prompt}
        tabIndex={-1}
        className="my-6 text-center text-5xl leading-[1.6] outline-none"
      >
        {/* Hidden until the clock starts, so it can't be read for free. */}
        {round.startedAt === null ? '…' : <Word item={question.item} />}
      </div>
      {round.startedAt === null ? (
        <div className="text-center">
          <button
            type="button"
            className={BUTTON}
            onClick={() => {
              moved.current = true;
              setRound({ ...round, startedAt: Date.now() });
            }}
          >
            להתחיל
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {round.options.map((id) => {
            const state = !chosen
              ? 'border-slate-300 hover:border-brand-strong hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800'
              : id === question.trope
                ? 'quiz-pop border-green-700 bg-green-50 dark:border-green-400 dark:bg-green-950/40'
                : id === chosen
                  ? 'quiz-shake border-red-700 bg-red-50 dark:border-red-400 dark:bg-red-950/40'
                  : 'border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400';
            // An icon as well as the colour, for those who can't tell green from red.
            const Icon = !chosen ? null : id === question.trope ? Check : id === chosen ? X : null;
            return (
              <button
                key={id}
                type="button"
                aria-disabled={chosen ? true : undefined}
                onClick={() => answer(id)}
                className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 py-3 text-xl transition-colors ${state}`}
              >
                {Icon && <Icon size={18} aria-hidden="true" className="shrink-0" />}
                {/* Only the name: the sign on it would give the answer away (Arye, 2026-11-06). */}
                <span>
                  <AnswerName id={id} question={question} unmarked />
                </span>
              </button>
            );
          })}
        </div>
      )}
      {/* No full stop after a name: some end in a colon (סוף פסוק). The link takes the
          content's link style (.wp-content-rendered a). */}
      <div aria-live="polite" className="mt-4 min-h-6 space-y-2">
        {chosen && (
          <>
            <p className="font-bold">
              {chosen === question.trope ? (
                round.cheer
              ) : (
                <>
                  {round.cheer} הטעם כאן: <AnswerName id={question.trope} question={question} />
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

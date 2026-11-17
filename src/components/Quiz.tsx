import { Check, Flame, Users, X } from 'lucide-react';
import React, { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  buildRound,
  cheer,
  chooseOptions,
  nextLevel,
  pickStreakLabel,
  shuffle,
  TIME_LIMITS,
  TIME_UP,
  TIME_UP_LINE,
  withPartner,
  type PreparedQuestion,
  type Question,
  type QuizItem,
  type QuizKind,
  type WordList,
} from '../lib/quiz';
import type { DuelRound, DuelView } from '../lib/duel';
import {
  emptyStats,
  readStats,
  recordAnswer,
  recordRound,
  type QuizStats,
} from '../lib/quiz-stats';
import { quizKeys, savedLevel, store, stored } from '../lib/quiz-storage';
import { QUIZZES_PAGE } from '../lib/quizzes';
import { track } from '../scripts/analytics';
import { DuelLobby, DuelResults, DuelScores, NameField } from './duel/DuelPanels';
import { useDuel } from './duel/useDuel';
import { QuizStatsPanel } from './QuizStatsPanel';

/** What makes one quiz differ from another: TropeQuiz.tsx, NiqqudQuiz.tsx, VowelClassQuiz.tsx. */
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
  /** The word list's entries to draw from (all if not given), and the answer each one asks. */
  groups?: readonly string[];
  answerOf?: (group: string) => string;
  /** Questions from each entry in a round, at most (one if not given): for all, or for each. */
  perGroup?: number | Readonly<Record<string, number>>;
  /** A group with fewer words is left to prepared questions (MIN_RANDOM if not given). */
  fewest?: number;
  /** Why the answer is right, in the feedback of a random question (the qamats quiz's rule). */
  explain?: (question: Question) => ReactNode;
  /** What is shown in the word's place (the sign quiz: a trope's name). */
  word?: (question: Question) => ReactNode;
  /** An option's name read aloud, where its text means nothing then (the sign quiz's signs). */
  optionLabel?: (index: number) => string;
  /**
   * A second level, chosen on the start screen (Arye, 2026-11-14), its progress kept only in
   * memory and never played in a duel: in the trope and niqqud quizzes, an easier one, the answer
   * drawn on one letter (an א) instead of a word from the Torah (`word`); in the sign quiz, words
   * from the Torah as the answers instead of signs (`name`). The groups it asks, and the kind its
   * options come from if not the quiz's (the trope quiz leaves out a מאילא, a טפחא on one letter).
   */
  letter?: {
    /** The question at this level, if the quiz has no `word` of its own. */
    word?: (question: Question) => ReactNode;
    groups: readonly string[];
    kind?: QuizKind;
    /**
     * An answer's name at this level, if not `name` (the sign quiz: its options are signs on an
     * א, and on this level words from the Torah).
     */
    name?: (id: string, question: Question, option: boolean) => ReactNode;
    /** The feedback's words before the answer's name at this level, if not `answerIs`. */
    answerIs?: string;
    /**
     * The start screen's choice, if not of the question ("בשאלה: מילה מהתורה / אות אחת"): its
     * heading, its name, and each level's (the sign quiz: "בתשובות: סימן על א / מילה מהתורה").
     */
    choice?: { heading: string; label: string; base: string; letter: string };
  };
  /**
   * An answer's partner, always among its options, on words and on one letter alike (the niqqud
   * quiz: מלא and חסר, גדולה and קטנה; Arye, 2026-11-15).
   */
  partners?: Readonly<Record<string, string>>;
  /**
   * The same options, in this order, for every question (a quiz with few answers); its level,
   * which only chooses options, then changes nothing.
   */
  options?: readonly string[];
  /** Name the answer after a right one too: a guess that was right still teaches. */
  nameRight?: boolean;
  /** The word's size, if not text-5xl (the servant quiz's two words, smaller on a phone). */
  wordSize?: string;
}

/** The questions skipped in later rounds: about ten rounds' worth. */
const RECENT_MAX = 100;

function recentKeys(key: string): string[] {
  const saved = stored(key);
  return Array.isArray(saved) ? saved.filter((item) => typeof item === 'string') : [];
}
export function isWordList(data: unknown): data is WordList {
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
const Word: React.FC<{ item: QuizItem; answered: boolean }> = ({ item, answered }) => {
  if (item.p) return <WithPaseq text={item.w} />;
  if (item.h) {
    const [start = 0, end = 0] = item.h;
    return (
      <>
        {item.w.slice(0, start)}
        {/* Once answered, the marked letters as written (the servant quiz's sign put back). */}
        <span className="mark-highlight">
          {answered && item.o ? item.o : item.w.slice(start, end)}
        </span>
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
/**
 * The start screen's choices, a row of segments on a grey track (Arye, 2026-11-17: the chosen ones
 * were the start button's solid green, three green blocks competing): the chosen segment white and
 * raised, in the links' green, so the start button is the screen's only solid one.
 */
const SEGMENTS = 'gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800';
const segment = (chosen: boolean) =>
  `cursor-pointer rounded-lg px-3 py-1.5 transition-colors ${
    chosen
      ? 'bg-white font-bold text-(--content-link) shadow-sm ring-1 ring-slate-200 dark:bg-slate-600 dark:text-white dark:ring-slate-500'
      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
  }`;
/** A choice's name above it: smaller than the question, a label rather than a heading. */
const CHOICE_LABEL = 'text-sm font-semibold text-slate-600 dark:text-slate-300';

interface Round {
  questions: Question[];
  index: number;
  /** The current question's options, chosen when it is reached (at the level of that moment). */
  options: string[];
  chosen: string | null;
  score: number;
  /** Each question answered so far, right or not: the round's summary shows them. */
  results: boolean[];
  /** The learner's answer to each (TIME_UP if time ran out; unknown back in a duel's room). */
  picks: (string | null)[];
  /** Right answers in a row, shown from three on. */
  run: number;
  /** How this round words the run ("רצף של 3"). */
  streakLabel: (run: number) => string;
  /** The feedback's first words (cheer). */
  cheer: string;
  /** When the current question was shown: a time limit counts from it. */
  startedAt: number;
  /** A duel's options, question by question, the same for every learner in it. */
  fixed?: string[][];
}

/**
 * The quiz's start: the time limit for each question, none or one of TIME_LIMITS, for the whole
 * quiz (Arye, 2026-11-10). Pressed/unpressed buttons: the choice shows at once.
 */
const TimeLimitPicker: React.FC<{
  limit: number | null;
  onChange: (limit: number | null) => void;
}> = ({ limit, onChange }) => {
  return (
    <div
      role="group"
      aria-label="זמן לכל שאלה"
      // Two by two on phones, one row from sm.
      className={`inline-grid grid-cols-2 sm:inline-flex ${SEGMENTS}`}
    >
      {[null, ...TIME_LIMITS].map((value) => (
        <button
          key={value ?? 'none'}
          type="button"
          aria-pressed={value === limit}
          className={segment(value === limit)}
          onClick={() => onChange(value)}
        >
          {value === null ? 'בלי הגבלת זמן' : `${value} שניות`}
        </button>
      ))}
    </div>
  );
};

/** A choice of two on the start screen, in the time limit's style. */
const Choice: React.FC<{
  label: string;
  options: readonly { value: boolean; text: string }[];
  chosen: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, options, chosen, onChange }) => (
  <div role="group" aria-label={label} className={`inline-flex ${SEGMENTS}`}>
    {options.map(({ value, text }) => (
      <button
        key={text}
        type="button"
        aria-pressed={value === chosen}
        className={segment(value === chosen)}
        onClick={() => onChange(value)}
      >
        {text}
      </button>
    ))}
  </div>
);

/** The countdown ring's radius and length, in the SVG's units (a 64-unit square). */
const RING_RADIUS = 29;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * The clock of a timed question (Arye, 2026-11-10): a ring that empties as the time runs out,
 * with the seconds left inside it, red for the last three (two, with a limit of three); no clock icon (Arye: the ring says
 * it). Drawn here, not with react-countdown-circle-timer, which Arye pointed to: that package has
 * had no release since March 2023, and would add its own animation loop beside the quiz's clock,
 * for a ring that takes a few lines of SVG.
 */
const Countdown: React.FC<{ left: number; seconds: number; share: number; hidden: boolean }> = ({
  left,
  seconds,
  share,
  hidden,
}) => {
  // Red for the last three seconds; with a limit of three, for the last two.
  const urgent = left <= Math.min(3, seconds - 1);
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
const keysOf = (config: QuizConfig) => quizKeys(config.storage);

const optionsFor = (
  config: QuizConfig,
  question: Question | undefined,
  level: number,
  letter: boolean,
) =>
  !question
    ? []
    : question.options
      ? shuffle(question.options)
      : config.options
        ? [...config.options]
        : withPartner(
            letter && config.letter
              ? chooseOptions(config.letter.kind ?? config.kind, question.answer, level)
              : chooseOptions(config.kind, question.answer, level, Math.random, question.item.x),
            question.answer,
            config.partners?.[question.answer],
          );

/** A round of these questions, at its start (its options set by the caller). */
const newRoundOf = (questions: Question[]): Round => ({
  questions,
  index: 0,
  options: [],
  chosen: null,
  score: 0,
  results: [],
  picks: [],
  run: 0,
  streakLabel: pickStreakLabel(),
  cheer: '',
  startedAt: Date.now(),
});

/**
 * A new round, its questions avoiding those asked recently; at the one-letter level (`letter`)
 * without prepared questions, which are about words.
 */
function newRound(config: QuizConfig, words: WordList, level: number, letter: boolean): Round {
  const oneLetter = letter ? config.letter : undefined;
  // One letter shows the answer alone: a question for each, the rarest included, no words needed.
  const list: WordList = oneLetter
    ? { ...words, items: Object.fromEntries(oneLetter.groups.map((id) => [id, [{ w: id }]])) }
    : words;
  const groups = oneLetter?.groups ?? config.groups;
  const questions = buildRound(list, config.prepared, new Set(recentKeys(keysOf(config).recent)), {
    preparedCount: oneLetter ? 0 : config.preparedCount,
    ...(groups && { groups }),
    ...(config.answerOf && { answerOf: config.answerOf }),
    ...(config.perGroup && { perGroup: config.perGroup }),
    ...(oneLetter ? { fewest: 1 } : config.fewest !== undefined && { fewest: config.fewest }),
  });
  return { ...newRoundOf(questions), options: optionsFor(config, questions[0], level, letter) };
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
  /** The one-letter level (`config.letter`), chosen on the start screen and remembered. */
  const [letter, setLetter] = useState(false);
  /** Whether the learner pressed "להתחיל": until then, the time limit is chosen. */
  const [started, setStarted] = useState(false);
  /** The time now, kept while a timed question runs, for its clock. */
  const [now, setNow] = useState(() => Date.now());
  /** The learner's results so far (Arye, 2026-11-10), shown on the start screen. */
  const [stats, setStats] = useState<QuizStats>(emptyStats);
  const next = useRef<HTMLButtonElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const result = useRef<HTMLDivElement>(null);
  const reviewPanel = useId();
  /**
   * The summary's question opened by its mark (Arye, 2026-11-16), for the round it was opened in.
   * Not in the round: a change there would move focus to the score, as the round's end does.
   */
  const [opened, setOpened] = useState<{ of: Question[]; index: number } | null>(null);
  const begin = useRef<HTMLButtonElement>(null);
  /** Whether the learner has started: only then does focus follow the quiz. */
  const moved = useRef(false);
  /** The learner's name for a duel, and whether they are opening one (the name asked first). */
  const [name, setName] = useState('');
  const [inviting, setInviting] = useState(false);

  /** A duel's round, once its host starts it: every learner in it plays the same. */
  function beginDuel(view: DuelView): boolean {
    // A round of this quiz only (a link from another quiz's page names its own), its options
    // and answers names this quiz knows.
    const ids: readonly string[] = config.kind.ids;
    const known = view.round?.questions.every(
      (entry) =>
        ids.includes(entry.question.answer) && entry.options.every((id) => ids.includes(id)),
    );
    if (!view.round || view.round.quiz !== config.storage || !known) return false;
    const fixed = view.round.questions.map((entry) => entry.options);
    // Back after a reload: from the learner's next question, with the score the room has.
    const done = view.players.find((player) => player.id === view.you)?.results ?? [];
    moved.current = true;
    setLimit(view.round.limit);
    setRound({
      ...newRoundOf(view.round.questions.map((entry) => entry.question)),
      index: done.length,
      score: done.filter(Boolean).length,
      results: done,
      picks: done.map(() => null),
      options: fixed[done.length] ?? [],
      fixed,
    });
    setStarted(true);
    return true;
  }

  const duel = useDuel(beginDuel);
  const inDuel = (duel.view?.startedAt ?? null) !== null;
  /** An answer's name at the level played (a duel plays words). */
  const atLetter = letter && !inDuel;
  const nameOf = (id: string, question: Question, option: boolean) =>
    (atLetter && config.letter?.name ? config.letter.name : config.name)(id, question, option);
  const answerIs = (atLetter && config.letter?.answerIs) || config.answerIs;
  /** A question as asked: its word, or what the quiz or its level shows instead. */
  const shown = (asked: Question, answered: boolean) =>
    config.word ? (
      config.word(asked)
    ) : atLetter && config.letter?.word ? (
      config.letter.word(asked)
    ) : (
      <Word item={asked.item} answered={answered} />
    );

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
        const oneLetter = !!config.letter && stored(keysOf(config).letter) === true;
        setList(data);
        setProgress({ level, streak: 0 });
        // A limit no longer offered (15, before 2026-11-15) becomes the longest one.
        setLimit(
          typeof savedLimit === 'number'
            ? (TIME_LIMITS.find((value) => value === savedLimit) ?? TIME_LIMITS[0])
            : null,
        );
        setLetter(oneLetter);
        const ids: readonly string[] = config.kind.ids;
        setStats(readStats(stored(keysOf(config).stats), (id) => ids.includes(id)));
        setRound(newRound(config, data, level, oneLetter));
      })
      .catch(() => setFailed(true));
  }, [config]);

  const question = round?.questions[round.index];
  /** Why the answer is right, when the quiz says (the qamats quiz, for a קמץ קטן). */
  const explanation = question && config.explain?.(question);

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

  /** The stats changed from their latest value (two answers in one moment both count once). */
  function saveStats(change: (stats: QuizStats) => QuizStats): void {
    setStats((current) => {
      const updated = change(current);
      store(keys.stats, updated);
      return updated;
    });
  }

  function chooseLimit(value: number | null): void {
    setLimit(value);
    store(keys.time, value);
  }

  function chooseLetter(value: boolean): void {
    if (!list) return;
    setLetter(value);
    store(keys.letter, value);
    // Back to words: their own level, which the one-letter level doesn't change.
    const level = value ? progress.level : savedLevel(keys.level);
    if (!value) setProgress({ level, streak: 0 });
    setRound(newRound(config, list, level, value));
  }

  function start(): void {
    if (!round) return;
    moved.current = true;
    setStarted(true);
    // The first question's clock runs from now, not from when the page loaded.
    setRound({ ...round, startedAt: Date.now() });
  }

  /** A duel for this round: its questions with their options, as every learner will see them. */
  function openDuel(): void {
    if (!round || !list) return;
    // A duel plays words from the Torah: the one-letter level is each learner's own choice, and a
    // friend on the word level would see the answer's name in place of a word.
    const level = letter ? savedLevel(keys.level) : progress.level;
    const base = letter ? newRound(config, list, level, false) : round;
    const questions: DuelRound['questions'] = base.questions.map((q, i) => ({
      question: q,
      options: i === 0 ? base.options : optionsFor(config, q, level, false),
    }));
    setInviting(false);
    duel.host(name, { quiz: config.storage, questions, limit });
  }

  /** Back to the start (Arye, 2026-11-10: a way to restart or quit): the round is dropped. */
  function restart(): void {
    if (!list) return;
    if (duel.status !== 'none') duel.leave();
    setStarted(false);
    setRound(newRound(config, list, progress.level, letter));
  }

  function answer(id: string): void {
    if (!round || !question || round.chosen) return;
    const correct = id === question.answer;
    moved.current = true;
    setRound({
      ...round,
      chosen: id,
      score: round.score + (correct ? 1 : 0),
      results: [...round.results, correct],
      picks: [...round.picks, id],
      // A mistake starts the count again, without saying so.
      run: correct ? round.run + 1 : 0,
      cheer: cheer(config.kind, question.answer, id),
    });
    saveStats((current) => recordAnswer(current, question.answer, correct, limit));
    if (inDuel) duel.answer(round.index, id);
    const updated = nextLevel(progress.level, progress.streak, correct);
    setProgress(updated);
    // The second level (`letter`) asks every answer each time: it changes neither how hard the
    // options are at the first (only its own, in memory: chooseLetter), nor which questions were
    // asked lately. A duel plays the first level, whatever the learner's.
    if (!letter || inDuel) {
      store(keys.level, updated.level);
      store(keys.recent, [...recentKeys(keys.recent), question.key].slice(-RECENT_MAX));
    }
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
        ...(config.letter && { letter: atLetter ? 'yes' : 'no' }),
      });
      if (round.score === round.questions.length) celebrate();
      saveStats((current) => recordRound(current, round.score, limit));
    }
    setRound({
      ...round,
      index: following,
      options:
        round.fixed?.[following] ??
        optionsFor(config, round.questions[following], progress.level, letter),
      chosen: null,
      startedAt: Date.now(),
    });
  }

  if (failed) return <p role="alert">החידון לא נטען. רעננו את העמוד ונסו שוב.</p>;
  if (!list || !round) return <p>החידון נטען…</p>;

  // Divs where a size is set: the content's paragraph style (.wp-content-rendered p) would win.
  if (!question) {
    const size = round.questions.length;
    const reviewed = opened?.of === round.questions ? opened.index : null;
    return (
      <div className="not-prose rounded-2xl border border-slate-200 p-6 text-center dark:border-slate-700">
        {/* Read aloud on arrival: the score and the rank, not every question's mark. */}
        <div ref={result} tabIndex={-1} className="space-y-3 outline-none" role="status">
          {/* One line read aloud ("זיהיתם נכון 2 מתוך 10"), the score large below its words. */}
          <div className="text-lg">
            זיהיתם נכון{' '}
            <span className="block text-4xl leading-tight font-bold text-(--content-link) sm:text-5xl">
              {round.score} מתוך {size}
            </span>
          </div>
          {inDuel && duel.view ? (
            <DuelResults view={duel.view} size={size} />
          ) : (
            config.result?.(round.score, size)
          )}
        </div>
        {/* The round at a glance: a mark for each question, in order; a click shows the question,
            its answer and the learner's (Arye, 2026-11-16). */}
        <ol
          className="mx-0! mt-4! mb-0! flex list-none! flex-wrap justify-center gap-0 p-0! sm:gap-1.5 [&>li]:m-0!"
          aria-label="התשובות בסבב"
        >
          {round.results.map((right, i) => (
            // oxlint-disable-next-line no-array-index-key -- the questions' order is fixed
            <li key={i}>
              <button
                type="button"
                aria-expanded={reviewed === i}
                aria-controls={reviewPanel}
                onClick={() => setOpened(reviewed === i ? null : { of: round.questions, index: i })}
                // On a phone, a 28px mark in a 32px button: easier to tap, ten still in a line.
                className="group block cursor-pointer rounded-full p-0.5 sm:p-0"
              >
                {/* The question's number, so the order reads plainly (Arye, 2026-11-17: with marks
                    alone it wasn't clear which end was first), its ✓ or ✗ under it. */}
                <span
                  aria-hidden="true"
                  className={`flex w-7 flex-col items-center rounded-full pt-0.5 pb-1 text-sm leading-tight font-bold ring-offset-2 ring-offset-white sm:w-8 sm:text-base dark:ring-offset-slate-900 ${
                    right
                      ? 'bg-green-100 text-green-800! ring-green-700 group-hover:bg-green-200 dark:bg-green-950 dark:text-green-300! dark:ring-green-400 dark:group-hover:bg-green-900'
                      : 'bg-red-100 text-red-800! ring-red-700 group-hover:bg-red-200 dark:bg-red-950 dark:text-red-300! dark:ring-red-400 dark:group-hover:bg-red-900'
                  } ${reviewed === i ? 'ring-2' : ''}`}
                >
                  {i + 1}
                  {right ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}
                </span>
                <span className="sr-only">{`שאלה ${i + 1}: ${right ? 'נכון' : 'לא נכון'}`}</span>
              </button>
            </li>
          ))}
        </ol>
        <div id={reviewPanel} aria-live="polite">
          {reviewed === null
            ? // Not "סימן": on this site that is a trope's sign (Arye's wording, 2026-11-17).
              round.results.length > 0 && (
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  לחצו על מספר השאלה כדי לראות את הפרטים שלה.
                </div>
              )
            : (() => {
                const asked = round.questions[reviewed];
                const pick = round.picks[reviewed];
                if (!asked) return null;
                // A quiz that asks a name (the sign quiz) shows the answers as its options were.
                const option = config.word !== undefined;
                return (
                  <div className="mx-auto mt-3 max-w-md space-y-1 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      שאלה {reviewed + 1}
                    </div>
                    {/* As asked, a sign or a vowel on one letter drawn larger. */}
                    <div
                      className={`leading-[1.6] ${atLetter && config.letter?.word ? 'text-4xl' : 'text-2xl'}`}
                    >
                      {shown(asked, true)}
                    </div>
                    <div>
                      התשובה הנכונה:{' '}
                      <span className="font-bold">{nameOf(asked.answer, asked, option)}</span>
                    </div>
                    {!round.results[reviewed] &&
                      (pick === TIME_UP ? (
                        <div>{TIME_UP_LINE}</div>
                      ) : (
                        pick && (
                          <div>
                            עניתם:{' '}
                            <span className="font-bold text-red-800 dark:text-red-300">
                              {nameOf(pick, asked, option)}
                            </span>
                          </div>
                        )
                      ))}
                  </div>
                );
              })()}
        </div>
        {/* The next step before the review, so a phone shows it without scrolling. */}
        {!inDuel && (
          <button
            type="button"
            className={`${BUTTON} mt-5`}
            onClick={() => setRound(newRound(config, list, progress.level, letter))}
          >
            סבב נוסף
          </button>
        )}
        <div>
          <button type="button" className={`${QUIET} mt-3`} onClick={restart}>
            למסך הפתיחה
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    const card =
      'not-prose space-y-4 rounded-2xl border border-slate-200 p-6 text-center dark:border-slate-700';
    // A duel (Arye, 2026-11-11): invited by a link, waiting in the room, or refused by it.
    if (duel.status === 'invited')
      return (
        <div className={card}>
          <div className="text-lg">הוזמנתם לחידון משותף.</div>
          <NameField value={name} onChange={setName} />
          <button type="button" className={BUTTON} onClick={() => duel.join(name)}>
            להצטרף
          </button>
          <div>
            <button type="button" className={QUIET} onClick={restart}>
              לחידון לבד
            </button>
          </div>
        </div>
      );
    if (['refused', 'gone', 'lost', 'other'].includes(duel.status))
      return (
        <div className={card}>
          <div>
            {duel.status === 'refused'
              ? 'החדר מלא, או שהחידון בו כבר התחיל.'
              : duel.status === 'gone'
                ? 'החדר הזה כבר לא קיים.'
                : duel.status === 'other'
                  ? 'החדר הזה שייך לחידון אחר.'
                  : 'החיבור לחדר נותק.'}
          </div>
          <button type="button" className={QUIET} onClick={restart}>
            לחידון לבד
          </button>
        </div>
      );
    if (duel.status !== 'none')
      return (
        <div className={card}>
          {duel.view && duel.link ? (
            <DuelLobby
              view={duel.view}
              link={duel.link}
              onStart={() => duel.start()}
              onLeave={restart}
            />
          ) : (
            <div>מתחברים…</div>
          )}
        </div>
      );
    return (
      <div className={card}>
        <div className="space-y-1.5">
          <div className={CHOICE_LABEL}>זמן לכל שאלה</div>
          <TimeLimitPicker limit={limit} onChange={chooseLimit} />
        </div>
        {config.letter && (
          <div className="space-y-1.5">
            <div className={CHOICE_LABEL}>{config.letter.choice?.heading ?? 'בשאלה'}</div>
            <Choice
              label={config.letter.choice?.label ?? 'מה מופיע בשאלה'}
              options={[
                { value: false, text: config.letter.choice?.base ?? 'מילה מהתורה' },
                { value: true, text: config.letter.choice?.letter ?? 'אות אחת' },
              ]}
              chosen={letter}
              onChange={chooseLetter}
            />
          </div>
        )}
        <div className="pt-2">
          <button
            ref={begin}
            type="button"
            className={`${BUTTON} px-10! py-3! text-lg!`}
            onClick={start}
          >
            להתחיל
          </button>
        </div>
        {inviting ? (
          <div className="space-y-3">
            <NameField value={name} onChange={setName} />
            <button type="button" className={BUTTON} onClick={openDuel}>
              לפתוח חדר
            </button>
          </div>
        ) : (
          // A button that looks like one, below the start (it was plain grey text).
          <button
            type="button"
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-2 border-slate-300 px-4 py-2 font-semibold text-slate-700 transition-colors hover:border-(--content-link) hover:text-(--content-link) dark:border-slate-600 dark:text-slate-200"
            onClick={() => setInviting(true)}
          >
            <Users size={18} aria-hidden="true" />
            לשחק עם חברים
          </button>
        )}
        <QuizStatsPanel
          stats={stats}
          size={round.questions.length}
          // A name as in an option's button; a question of its own (it adds nothing to the name).
          name={(id) => config.name(id, { answer: '', key: '', group: '', item: { w: '' } }, true)}
          onReset={() => {
            saveStats(emptyStats);
            // The panel goes away with the button pressed: focus to the start.
            begin.current?.focus();
          }}
        />
        {/* Every quiz, with the learner's results in each (Arye, 2026-11-15). */}
        <p className="m-0! text-center text-sm!">
          <a href={encodeURI(QUIZZES_PAGE)}>לכל החידונים והתוצאות שלכם</a>
        </p>
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
              seconds={seconds}
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
      {inDuel && duel.view && (
        <DuelScores view={duel.view} index={round.index} answered={chosen !== null} />
      )}
      {inDuel && duel.status !== 'open' && (
        <p role="status" className="mt-2 text-center text-sm">
          {duel.status === 'gone' ? 'זמן החדר נגמר.' : 'החיבור לחדר נותק: ממשיכים לנסות…'}
        </p>
      )}
      <div id={prompt} className="mt-1 text-center text-lg">
        {config.prompt(question)}
      </div>
      <div
        ref={word}
        // The question is read with the word, which takes the focus after it.
        aria-describedby={prompt}
        tabIndex={-1}
        className={`my-6 text-center leading-[1.6] outline-none ${config.wordSize ?? 'text-5xl'}`}
      >
        {shown(question, chosen !== null)}
      </div>
      {/* Three options side by side (short names: the vowel-class quiz), four two by two. */}
      <div
        className={`grid gap-3 ${round.options.length === 3 ? 'mx-auto max-w-xl grid-cols-3' : 'grid-cols-2'}`}
      >
        {round.options.map((id, index) => {
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
              aria-label={config.optionLabel?.(index)}
              onClick={() => answer(id)}
              // Narrower padding three across, so a name and its icon fit a 320px phone.
              className={`inline-flex cursor-pointer items-center justify-center rounded-xl border-2 py-3 text-xl transition-colors ${
                round.options.length === 3 ? 'gap-1 px-1' : 'gap-2 px-3'
              } ${state}`}
            >
              {Icon && <Icon size={18} aria-hidden="true" className="shrink-0" />}
              <span>{nameOf(id, question, true)}</span>
            </button>
          );
        })}
      </div>
      {/* No full stop after a name: it may end in a colon (the trope quiz's סוף פסוק). Centred
          like the rest of the card, the verdict in green or red (Arye, 2026-11-17); divs, since
          the content's paragraph margins would widen the gaps. */}
      <div aria-live="polite" className="mt-4 min-h-6 space-y-1 text-center">
        {chosen && (
          <>
            <div
              className={`text-lg font-bold ${
                chosen === question.answer
                  ? 'text-green-800 dark:text-green-300'
                  : 'text-red-800 dark:text-red-300'
              }`}
            >
              {chosen === question.answer && !config.nameRight ? (
                round.cheer
              ) : (
                <>
                  {round.cheer} {answerIs} {nameOf(question.answer, question, false)}
                </>
              )}
            </div>
            {question.why && config.why && <div>{config.why(question.why)}</div>}
            {explanation && <div>{explanation}</div>}
            <div>{config.more(question)}</div>
          </>
        )}
      </div>
      {/* The next step under the feedback, the way back under it, as at the round's end. */}
      <div className="mt-5 flex flex-col items-center gap-3">
        {chosen && (
          <button ref={next} type="button" className={BUTTON} onClick={goOn}>
            {round.index + 1 < round.questions.length ? 'לשאלה הבאה' : 'לתוצאה'}
          </button>
        )}
        <button type="button" className={QUIET} onClick={restart}>
          {inDuel ? 'לצאת מהחדר' : 'למסך הפתיחה'}
        </button>
      </div>
    </div>
  );
};

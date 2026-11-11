/**
 * A quiz duel (Arye, 2026-11-11: "challenge a friend: they play at the same time and see each
 * other's score, and whether the friend answered first"): a room that several learners join by
 * one link, all playing the same round. The room (src/server/quiz-duel.ts, a Durable Object)
 * keeps this state; each learner's quiz (src/components/Quiz.tsx, src/components/duel/) sends
 * its moves and shows the view it gets back. No accounts: a learner is a random secret their
 * browser keeps (never shown to the others, who see a number the room gives them), and a name
 * they type; the room forgets both ROOM_LIFETIME after it opens.
 *
 * Pure functions, so the rules are tested without a server.
 */
import type { Question, QuizItem } from './quiz';

/** At most this many learners in a room. */
export const MAX_PLAYERS = 6;
/** A name's longest length, in characters. */
export const MAX_NAME = 20;
/** The longest message a room reads: ten questions, and their words, are far below it. */
export const MAX_MESSAGE = 32_000;
/** How long a room lasts, from its opening: then all it holds is deleted. */
export const ROOM_LIFETIME = 3 * 60 * 60 * 1000;

/** One question of the room's round, with its options in the order every learner sees them. */
export interface DuelQuestion {
  question: Question;
  options: string[];
}

export interface DuelRound {
  /** The quiz it is from (its `storage` name): a link to a room opens only on that quiz's page. */
  quiz: string;
  questions: DuelQuestion[];
  /** Seconds for each question, or none. */
  limit: number | null;
}

export interface Player {
  /** The learner's secret: proves a message is theirs; never sent to anyone else. */
  secret: string;
  /** What the others know them by: their number in the room. */
  id: string;
  name: string;
  /** The answers given, question by question: right or not, and when. */
  answers: { correct: boolean; at: number }[];
}

export interface DuelState {
  /** The secret of the learner who leads the room: they send its round and start it. */
  host: string | null;
  players: Player[];
  /** Learners who have joined so far: the next one's number. */
  joined: number;
  round: DuelRound | null;
  /** When the host started the round; until then the room is a lobby. */
  startedAt: number | null;
  /** Once the room's time is over: nothing more is kept, nobody joins. */
  closed: boolean;
}

export const emptyState = (): DuelState => ({
  host: null,
  players: [],
  joined: 0,
  round: null,
  startedAt: null,
  closed: false,
});

/** What a learner sends. `opening`: their hello opens the room (only the host's does). */
export type Move =
  | { t: 'hello'; player: string; name: string; opening: boolean }
  | { t: 'round'; round: DuelRound }
  | { t: 'start' }
  | { t: 'answer'; index: number; choice: string };

/**
 * What a learner sees of another: their score and how far they are, right or wrong on each
 * question (which doesn't tell which option was right), and on each question both have answered,
 * whether they answered first.
 */
export interface PlayerView {
  id: string;
  name: string;
  score: number;
  results: boolean[];
  /** Whether they answered it before this learner, for each question this learner answered. */
  first: boolean[];
}

export interface DuelView {
  you: string;
  host: string | null;
  players: PlayerView[];
  round: DuelRound | null;
  startedAt: number | null;
}

const isString = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max;
const isInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value);

/**
 * Characters a name can't hold: control characters, and the invisible ones that mark or turn the
 * direction of the text around them (Arabic letter mark, zero-width and direction marks and
 * embeddings, word joiner and isolates, byte order mark). Code point ranges, so they are readable.
 */
const INVISIBLE: readonly [number, number][] = [
  [0x00, 0x1f],
  [0x7f, 0x9f],
  [0x61c, 0x61c],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2069],
  [0xfeff, 0xfeff],
];
const INVISIBLE_PATTERN = new RegExp(
  `[${INVISIBLE.map(([from, to]) => `\\u{${from.toString(16)}}-\\u{${to.toString(16)}}`).join('')}]`,
  'gu',
);

/** A name as shown: no invisible characters (INVISIBLE), spaces collapsed, at most MAX_NAME. */
export const cleanName = (name: string): string =>
  name.replace(INVISIBLE_PATTERN, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);

/** A question's word as the quiz draws it, rebuilt from only the fields it knows. */
function itemOf(value: unknown): QuizItem | null {
  if (!value || typeof value !== 'object') return null;
  const [w, m, h, p] = ['w', 'm', 'h', 'p'].map((name): unknown => Reflect.get(value, name));
  if (!isString(w, 200)) return null;
  if (m !== undefined && !isInteger(m)) return null;
  if (h !== undefined && !(Array.isArray(h) && h.length === 2 && h.every(isInteger))) return null;
  if (p !== undefined && typeof p !== 'boolean') return null;
  return {
    w,
    ...(m !== undefined && { m }),
    ...(Array.isArray(h) && { h: h.filter(isInteger) }),
    ...(p !== undefined && { p }),
  };
}

/** One question, rebuilt from only the fields the quiz reads (a host's round is a stranger's). */
function questionOf(value: unknown): DuelQuestion | null {
  if (!value || typeof value !== 'object') return null;
  const options: unknown = Reflect.get(value, 'options');
  const question: unknown = Reflect.get(value, 'question');
  if (!question || typeof question !== 'object') return null;
  const [answer, key, why] = ['answer', 'key', 'why'].map((name): unknown =>
    Reflect.get(question, name),
  );
  const item = itemOf(Reflect.get(question, 'item'));
  if (
    !item ||
    !Array.isArray(options) ||
    options.length < 2 ||
    options.length > 4 ||
    !options.every((option) => isString(option, 40)) ||
    !isString(answer, 40) ||
    !options.includes(answer) ||
    !isString(key, 400) ||
    (why !== undefined && !isString(why, 400))
  )
    return null;
  return {
    question: { answer, key, item, ...(why !== undefined && { why }) },
    options: options.filter((option) => typeof option === 'string'),
  };
}

function roundOf(value: unknown): DuelRound | null {
  if (!value || typeof value !== 'object') return null;
  const [quiz, questions, limit] = ['quiz', 'questions', 'limit'].map((name): unknown =>
    Reflect.get(value, name),
  );
  if (!isString(quiz, 40)) return null;
  if (limit !== null && !(isInteger(limit) && limit > 0 && limit <= 60)) return null;
  if (!Array.isArray(questions) || questions.length === 0 || questions.length > 10) return null;
  const rebuilt = questions.map(questionOf);
  if (!rebuilt.every((q) => q !== null)) return null;
  return { quiz, questions: rebuilt, limit };
}

/** A message from a learner as a move, or null if it isn't one (sizes checked too). */
export function parseMove(text: string): Move | null {
  if (text.length > MAX_MESSAGE) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const field = (name: string): unknown => Reflect.get(data, name);
  const [player, name, opening, index, choice] = [
    'player',
    'name',
    'opening',
    'index',
    'choice',
  ].map(field);
  switch (field('t')) {
    case 'hello':
      return isString(player, 64) && typeof name === 'string' && typeof opening === 'boolean'
        ? { t: 'hello', player, name, opening }
        : null;
    case 'round': {
      const round = roundOf(field('round'));
      return round ? { t: 'round', round } : null;
    }
    case 'start':
      return { t: 'start' };
    case 'answer':
      return isInteger(index) && isString(choice, 40) ? { t: 'answer', index, choice } : null;
    default:
      return null;
  }
}

/** Why a learner can't join: the room is full or started, or doesn't exist (any more). */
export type Refusal = 'full' | 'gone';

/** Whether `player`'s hello would be refused, and why. */
export function refusal(state: DuelState, move: Move & { t: 'hello' }): Refusal | null {
  if (state.closed) return 'gone';
  if (state.players.some((p) => p.secret === move.player)) return null;
  // A room nobody opened: an old or mistyped link, not a new room for whoever comes.
  if (state.joined === 0 && !move.opening) return 'gone';
  // Late comers can't join a round already started: they'd be behind from the first question.
  if (state.players.length >= MAX_PLAYERS || state.startedAt !== null) return 'full';
  return null;
}

/**
 * The state after `player`'s move at `now`, or null if the move isn't allowed or changes nothing
 * (a stranger's move, a second round, an answer out of turn, the same name again...): the room
 * then writes nothing and tells nobody.
 */
export function apply(state: DuelState, player: string, move: Move, now: number): DuelState | null {
  if (state.closed) return null;
  const me = state.players.find((p) => p.secret === player);
  switch (move.t) {
    case 'hello': {
      if (refusal(state, move)) return null;
      const number = me ? me.id : String(state.joined + 1);
      const name = cleanName(move.name) || `שחקן ${number}`;
      if (me)
        return me.name === name
          ? null
          : { ...state, players: state.players.map((p) => (p === me ? { ...p, name } : p)) };
      return {
        ...state,
        host: state.host ?? player,
        joined: state.joined + 1,
        players: [...state.players, { secret: player, id: number, name, answers: [] }],
      };
    }
    case 'round':
      return me && state.host === player && !state.round ? { ...state, round: move.round } : null;
    case 'start':
      return me && state.host === player && state.round && state.startedAt === null
        ? { ...state, startedAt: now }
        : null;
    case 'answer': {
      const question = state.round?.questions[move.index];
      if (!me || state.startedAt === null || !question || move.index !== me.answers.length)
        return null;
      const answer = { correct: move.choice === question.question.answer, at: now };
      return {
        ...state,
        players: state.players.map((p) =>
          p === me ? { ...p, answers: [...p.answers, answer] } : p,
        ),
      };
    }
    default:
      return null;
  }
}

/**
 * The state once `player` has left (their last connection closed): before the start they leave
 * the room, and if they led it, the next learner does; after the start they stay, with their
 * score. Null when nothing changes.
 */
export function leave(state: DuelState, player: string): DuelState | null {
  if (state.startedAt !== null || !state.players.some((p) => p.secret === player)) return null;
  const players = state.players.filter((p) => p.secret !== player);
  const host = state.host === player ? (players[0]?.secret ?? null) : state.host;
  return { ...state, players, host };
}

/** The room once its time is over: nothing of its learners kept. */
export const closedState = (): DuelState => ({ ...emptyState(), closed: true });

/** What `player` is shown of the room: the others by their number, never by their secret. */
export function viewFor(state: DuelState, player: string): DuelView {
  const me = state.players.find((p) => p.secret === player);
  const mine = me?.answers ?? [];
  return {
    you: me?.id ?? '',
    host: state.players.find((p) => p.secret === state.host)?.id ?? null,
    round: state.round,
    startedAt: state.startedAt,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.answers.filter((a) => a.correct).length,
      results: p.answers.map((a) => a.correct),
      first: mine.map((a, i) => (p.answers[i]?.at ?? Infinity) < a.at),
    })),
  };
}

import { describe, expect, it } from 'vitest';
import {
  apply,
  cleanName,
  closedState,
  emptyState,
  leave,
  MAX_PLAYERS,
  parseMove,
  refusal,
  viewFor,
  type DuelRound,
  type DuelState,
  type Move,
} from './duel';

const round: DuelRound = {
  quiz: 'trope-quiz',
  limit: 10,
  questions: ['א', 'ב'].map((w, i) => ({
    question: { answer: 'מונח', key: `מונח|${w}`, item: { w } },
    options: i === 0 ? ['מונח', 'מהפך'] : ['מהפך', 'מונח'],
  })),
};

type Hello = Move & { t: 'hello' };
const hello = (player: string, name = '', opening = false): Hello => ({
  t: 'hello',
  player,
  name,
  opening,
});

/** The state after these moves, each by its player at its time; a refused move fails the test. */
function play(...moves: [string, Move, number][]): DuelState {
  return moves.reduce<DuelState>((state, [player, move, at]) => {
    const next = apply(state, player, move, at);
    if (!next) throw new Error(`refused: ${player} ${JSON.stringify(move)}`);
    return next;
  }, emptyState());
}

const lobby = (): DuelState =>
  play(
    ['host-secret', hello('host-secret', 'דנה', true), 0],
    ['host-secret', { t: 'round', round }, 1],
    ['guest-secret', hello('guest-secret'), 2],
  );

const started = (): DuelState =>
  play(
    ['host-secret', hello('host-secret', 'דנה', true), 0],
    ['host-secret', { t: 'round', round }, 1],
    ['guest-secret', hello('guest-secret', 'יוסי'), 2],
    ['host-secret', { t: 'start' }, 3],
    ['guest-secret', { t: 'answer', index: 0, choice: 'מונח' }, 4],
    ['host-secret', { t: 'answer', index: 0, choice: 'מהפך' }, 5],
  );

describe('a duel room', () => {
  it('makes its opener the host, whose round and start it takes', () => {
    const state = lobby();
    expect(state.players.map((p) => p.name)).toEqual(['דנה', 'שחקן 2']);
    expect(apply(state, 'guest-secret', { t: 'start' }, 3)).toBeNull();
    expect(apply(state, 'host-secret', { t: 'round', round }, 3)).toBeNull();
    expect(apply(state, 'host-secret', { t: 'start' }, 3)?.startedAt).toBe(3);
  });

  it("shows learners by their number in the room, never by their browser's secret", () => {
    expect(JSON.stringify(viewFor(started(), 'guest-secret'))).not.toContain('secret');
    const view = viewFor(started(), 'host-secret');
    expect(view.you).toBe('1');
    expect(view.host).toBe('1');
    expect(view.players.map((p) => p.id)).toEqual(['1', '2']);
  });

  it('takes answers in order, after the start, checking them itself', () => {
    expect(apply(lobby(), 'guest-secret', { t: 'answer', index: 0, choice: 'מונח' }, 3)).toBeNull();
    const state = started();
    expect(apply(state, 'guest-secret', { t: 'answer', index: 0, choice: 'מונח' }, 6)).toBeNull();
    expect(apply(state, 'guest-secret', { t: 'answer', index: 5, choice: 'מונח' }, 6)).toBeNull();
    // Someone who knows only a learner's number can't answer in their name.
    expect(apply(state, '2', { t: 'answer', index: 1, choice: 'מונח' }, 6)).toBeNull();
    const view = viewFor(state, 'host-secret');
    expect(view.players[1]).toMatchObject({
      name: 'יוסי',
      score: 1,
      results: [true],
      first: [true],
    });
    expect(view.players[0]).toMatchObject({ score: 0, results: [false], first: [false] });
  });

  it('refuses strangers once full or started, and a link to a room nobody opened', () => {
    let state = lobby();
    for (let i = state.players.length; i < MAX_PLAYERS; i++)
      state = apply(state, `p${i}`, hello(`p${i}`), 3) ?? state;
    expect(state.players).toHaveLength(MAX_PLAYERS);
    expect(refusal(state, hello('late'))).toBe('full');
    expect(refusal(started(), hello('late'))).toBe('full');
    expect(refusal(started(), hello('guest-secret'))).toBeNull();
    expect(refusal(emptyState(), hello('guest'))).toBe('gone');
    expect(refusal(closedState(), hello('host-secret', '', true))).toBe('gone');
  });

  it('writes nothing for a hello that changes nothing', () => {
    expect(apply(lobby(), 'host-secret', hello('host-secret', 'דנה', true), 3)).toBeNull();
  });

  it('lets a learner leave the lobby, passing the lead on; after the start they stay', () => {
    const left = leave(lobby(), 'host-secret');
    expect(left?.players.map((p) => p.id)).toEqual(['2']);
    expect(left && viewFor(left, 'guest-secret').host).toBe('2');
    expect(leave(started(), 'host-secret')).toBeNull();
    // A room its only learner left a moment ago (a reload) is still there to come back to.
    const empty = leave(play(['host-secret', hello('host-secret', 'דנה', true), 0]), 'host-secret');
    expect(empty && refusal(empty, hello('host-secret'))).toBeNull();
  });
});

describe('parseMove', () => {
  it('reads the moves it knows, rebuilding a round from the fields the quiz reads', () => {
    expect(parseMove('{"t":"start"}')).toEqual({ t: 'start' });
    expect(parseMove('{"t":"answer","index":1,"choice":"מונח"}')).toEqual({
      t: 'answer',
      index: 1,
      choice: 'מונח',
    });
    const extra = {
      ...round,
      questions: round.questions.map((q) => ({
        ...q,
        question: { ...q.question, script: '<b>', item: { ...q.question.item, x: 1 } },
      })),
    };
    expect(parseMove(JSON.stringify({ t: 'round', round: extra }))).toEqual({ t: 'round', round });
  });

  it('refuses anything else', () => {
    const [first] = round.questions;
    const broken = (change: object) =>
      JSON.stringify({ t: 'round', round: { ...round, questions: [{ ...first, ...change }] } });
    for (const text of [
      'not json',
      '{"t":"answer","index":"1","choice":"מונח"}',
      '{"t":"hello","player":"","name":"x","opening":false}',
      '{"t":"hello","player":"x","name":"x"}',
      '{"t":"delete"}',
      JSON.stringify({ t: 'round', round: { ...round, limit: -1 } }),
      broken({ question: { ...first?.question, item: { w: 'א', h: 5 } } }),
      broken({ options: ['מהפך', 'מרכא'] }),
      JSON.stringify({ t: 'hello', player: 'x', name: 'x'.repeat(40_000), opening: false }),
    ])
      expect(parseMove(text), text.slice(0, 60)).toBeNull();
  });
});

describe('cleanName', () => {
  it('drops control and direction characters and keeps names short', () => {
    expect(cleanName('  דנה‮  כהן\u0000؜ ')).toBe('דנה כהן');
    expect(cleanName('x'.repeat(50))).toHaveLength(20);
    expect(cleanName(`a${String.fromCodePoint(0x2060)}b${String.fromCodePoint(0xfeff)}c`)).toBe(
      'abc',
    );
  });
});

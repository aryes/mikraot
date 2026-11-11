import { describe, expect, it } from 'vitest';
import wordList from '../../public/quiz/servant-words.json';
import { buildRound, cheer, chooseOptions, MAX_LEVEL, MISSES, type WordList } from './quiz';
import { DISJUNCTIVES, SERVANT_QUIZ, SERVANTS } from './servant-quiz';
import { trope } from './tropes';

const list = wordList as WordList;
const servants: readonly string[] = SERVANTS;

describe('the servant quiz data', () => {
  it('names known tropes, each with its page', () => {
    for (const id of [...SERVANTS, ...DISJUNCTIVES]) trope(id);
  });

  it('asks about servants, marking the first word, which has lost its sign', () => {
    for (const items of Object.values(list.items)) {
      for (const { w, h, a, x = [] } of items) {
        expect(servants, w).toContain(a);
        for (const other of x) expect(servants, w).toContain(other);
        expect(x, w).not.toContain(a);
        const [start, end] = h ?? [];
        expect(start, w).toBe(0);
        expect(w[end ?? 0], w).toBe(' ');
      }
    }
  });
});

describe('a servant round', () => {
  it('asks ten disjunctives, never offering a servant that would also be right', () => {
    const round = buildRound(list, [], new Set(), { preparedCount: 0 });
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.group)).size).toBe(10);
    for (const q of round) {
      expect(q.answer).toBe(q.item.a);
      for (let level = 0; level <= MAX_LEVEL; level++) {
        const options = chooseOptions(SERVANT_QUIZ, q.answer, level, Math.random, q.item.x);
        expect(options).toHaveLength(4);
        expect(options).toContain(q.answer);
        for (const other of q.item.x ?? []) expect(options).not.toContain(other);
      }
    }
  });
});

describe('the servant quiz feedback', () => {
  it('never says two servants look alike, since their signs are hidden', () => {
    for (let i = 0; i < 20; i++) expect(MISSES).toContain(cheer(SERVANT_QUIZ, 'מונח', 'מרכא'));
  });
});

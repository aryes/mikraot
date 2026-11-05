import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import prepared from '../data/quiz/prepared.json';
import wordList from '../../public/quiz/trope-words.json';
import {
  LOOK_ALIKES,
  MAX_LEVEL,
  MIN_RANDOM,
  QUIZ_TROPES,
  buildRound,
  chooseOptions,
  lookAlikes,
  nextLevel,
  type PreparedQuestion,
  type WordList,
} from './trope-quiz';
import { SWITCHABLE, plainName, trope } from './tropes';

/** A repeatable stand-in for Math.random. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const list = wordList as WordList;
const questions = prepared as PreparedQuestion[];
const ids: readonly string[] = QUIZ_TROPES;

describe('the quiz data', () => {
  it('names only known tropes, each with its own page', () => {
    for (const id of [
      ...ids,
      ...LOOK_ALIKES.flat(),
      ...questions.flatMap((q) => [q.trope, ...(q.options ?? [])]),
    ]) {
      expect(ids, id).toContain(id);
      expect(existsSync(`src/content/pages/${id}.mdoc`), id).toBe(true);
      trope(id);
    }
  });

  it('never shows two options with the same name', () => {
    for (const nusach of SWITCHABLE) {
      const names = ids.map((id) => plainName(trope(id)[nusach]));
      expect(new Set(names).size, nusach).toBe(names.length);
    }
  });

  it('has prepared questions for the tropes too rare to draw at random', () => {
    for (const id of ids) {
      const random = list.items[id]?.length ?? 0;
      if (random < MIN_RANDOM)
        expect(
          questions.some((q) => q.trope === id),
          id,
        ).toBe(true);
    }
  });

  it('writes prepared options with the answer among four, and explanations with known names', () => {
    for (const q of questions) {
      if (q.options)
        expect(new Set(q.options).size === 4 && q.options.includes(q.trope), q.item.w).toBe(true);
      for (const [, id] of q.why.matchAll(/\{([^}]+)\}/g)) expect(ids, q.item.w).toContain(id);
    }
  });
});

describe('chooseOptions', () => {
  it('gives four different options, the answer among them', () => {
    const random = seeded(1);
    for (const id of ids) {
      for (let level = 0; level <= MAX_LEVEL; level++) {
        const options = chooseOptions(id, level, random);
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        expect(options).toContain(id);
      }
    }
  });

  it('at the highest level, offers look-alikes of the answer', () => {
    const options = chooseOptions('זקף-קטן', MAX_LEVEL, seeded(2));
    expect(options.filter((id) => lookAlikes('זקף-קטן').includes(id)).length).toBe(3);
  });

  it('never offers a name that is also shown (the אתנח beside a מאילא)', () => {
    const random = seeded(3);
    for (let i = 0; i < 50; i++) {
      const options = chooseOptions('מאילא', MAX_LEVEL, random);
      expect(options).not.toContain('אתנחתא');
      expect(options).not.toContain('סוף-פסוק');
    }
  });
});

describe('nextLevel', () => {
  it('rises after two right answers and falls after a wrong one', () => {
    expect(nextLevel(0, 0, true)).toEqual({ level: 0, streak: 1 });
    expect(nextLevel(0, 1, true)).toEqual({ level: 1, streak: 0 });
    expect(nextLevel(MAX_LEVEL, 1, true)).toEqual({ level: MAX_LEVEL, streak: 0 });
    expect(nextLevel(2, 1, false)).toEqual({ level: 1, streak: 0 });
    expect(nextLevel(0, 0, false)).toEqual({ level: 0, streak: 0 });
  });
});

describe('buildRound', () => {
  it('makes ten different questions, two of them prepared', () => {
    const round = buildRound(list, questions, new Set(), { random: seeded(4) });
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.key)).size).toBe(10);
    expect(round.filter((q) => q.why).length).toBe(2);
  });

  it('skips recently asked questions', () => {
    const first = buildRound(list, questions, new Set(), { random: seeded(5) });
    const second = buildRound(list, questions, new Set(first.map((q) => q.key)), {
      random: seeded(5),
    });
    expect(second.some((q) => first.some((f) => f.key === q.key))).toBe(false);
  });

  it('draws random questions only for tropes with enough words', () => {
    const round = buildRound(list, [], new Set(), { size: 200, random: seeded(6) });
    for (const q of round)
      expect(list.items[q.trope]?.length ?? 0).toBeGreaterThanOrEqual(MIN_RANDOM);
  });
});

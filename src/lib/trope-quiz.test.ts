import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import prepared from '../data/quiz/prepared.json';
import wordList from '../../public/quiz/trope-words.json';
import {
  LOOK_ALIKES,
  MAX_LEVEL,
  MIN_RANDOM,
  QUIZ_TROPES,
  CHEERS,
  MISSES,
  NEAR_MISSES,
  RANKS,
  STREAK_LABELS,
  pickStreakLabel,
  buildRound,
  cheer,
  chooseOptions,
  lookAlikes,
  nextLevel,
  rankOf,
  type PreparedQuestion,
  type WordList,
} from './trope-quiz';
import { SWITCHABLE, plainName, trope, unmarkedName } from './tropes';

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

  it('offers names without the sign they name', () => {
    for (const nusach of SWITCHABLE) {
      for (const id of ids) {
        const name = unmarkedName(trope(id)[nusach]);
        expect(name, id).not.toMatch(/[\u0591-\u05AF\u05BD\u05C0\u05C3:]/u);
        expect(name, id).toMatch(/^[\u05B0-\u05EA\u05BE ]+$/u);
      }
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
      for (const [, id] of (q.why ?? '').matchAll(/\{([^}]+)\}/g))
        expect(ids, q.item.w).toContain(id);
    }
  });
});

describe('the prepared questions', () => {
  it('explain the look-alikes, not the rare tropes, whose sign is on the screen', () => {
    for (const q of questions) {
      const rare = (list.items[q.trope]?.length ?? 0) < MIN_RANDOM;
      expect(q.why === undefined, q.item.w).toBe(rare);
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
  const preparedKeys = new Set(questions.map((q) => `${q.trope}|${q.item.w}`));

  it('makes ten questions on ten different tropes, two of them prepared', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const round = buildRound(list, questions, new Set(), { random: seeded(seed) });
      expect(round).toHaveLength(10);
      expect(new Set(round.map((q) => q.trope)).size).toBe(10);
      // At least: a random word can be one a prepared question also uses (צֹ֣הַר ׀).
      expect(round.filter((q) => preparedKeys.has(q.key)).length).toBeGreaterThanOrEqual(2);
    }
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
    // Each trope once: a round can't be longer than the tropes it draws from.
    const drawn = Object.values(list.items).filter((items) => items.length >= MIN_RANDOM);
    expect(round).toHaveLength(drawn.length);
  });
});

describe('rankOf', () => {
  it('names the rank of a round of ten', () => {
    const ranks = [0, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => rankOf(score, 10).anchor);
    expect(ranks).toEqual([
      'servants',
      'servants',
      'counts',
      'counts',
      'dukes',
      'dukes',
      'kings',
      'kings',
      'emperors',
    ]);
  });

  it('links each rank to a section of the hierarchy page', () => {
    const page = readFileSync('src/content/pages/trope-hierarchy.mdoc', 'utf8');
    for (const rank of RANKS) expect(page, rank.name).toContain(`{% #${rank.anchor} %}`);
  });
});

describe('cheer', () => {
  it('cheers a right answer and is kinder to a look-alike than to a wild guess', () => {
    expect(CHEERS).toContain(cheer('מונח', 'מונח', seeded(1)));
    const random = seeded(2);
    for (let i = 0; i < 20; i++) {
      expect(NEAR_MISSES).toContain(cheer('מונח', 'מהפך', random));
      expect(MISSES).toContain(cheer('מונח', 'זקף-גדול', random));
    }
  });
});

describe('pickStreakLabel', () => {
  it('words a run of right answers in one of the approved ways, with its number', () => {
    const random = seeded(4);
    const words = new Set<string>();
    for (let i = 0; i < 50; i++) words.add(pickStreakLabel(random)(7));
    // Every wording turns up, each with its number, and none other.
    expect([...words].toSorted()).toEqual(STREAK_LABELS.map((label) => label(7)).toSorted());
    expect(pickStreakLabel(() => 0.999_999)(3)).toBe(STREAK_LABELS.at(-1)?.(3));
  });
});

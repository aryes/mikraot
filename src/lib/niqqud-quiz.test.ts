import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import wordList from '../../public/quiz/niqqud-words.json';
import qamatsList from '../../public/quiz/qamats-words.json';
import { MIN_RANDOM, buildRound, chooseOptions, type WordList } from './quiz';
import {
  NIQQUD_GROUPS,
  NIQQUD_PAGE,
  NIQQUD_QUIZ,
  QAMATS_KINDS,
  QUIZ_VOWELS,
  VOWEL_CLASS_OF,
  VOWEL_CLASSES,
  VOWEL_LOOK_ALIKES,
  vowelName,
} from './niqqud-quiz';

const list = wordList as WordList;
const ids: readonly string[] = QUIZ_VOWELS;

describe('the niqqud quiz data', () => {
  it('groups only known niqqud as look-alikes', () => {
    for (const id of VOWEL_LOOK_ALIKES.flat()) expect(ids, id).toContain(id);
  });

  it('has enough words to ask about every niqqud at random (it has no prepared questions)', () => {
    for (const id of ids)
      expect(list.items[id]?.length ?? 0, id).toBeGreaterThanOrEqual(MIN_RANDOM);
  });

  it('marks letters inside each word, the words without cantillation marks', () => {
    for (const items of Object.values(list.items)) {
      for (const { w, h } of items) {
        expect(h, w).toHaveLength(2);
        const [start = 0, end = 0] = h ?? [];
        expect(start >= 0 && start < end && end <= w.length, w).toBe(true);
        expect(w, w).toMatch(/^[ְ-ּׁׂא-ת]+$/u);
      }
    }
  });

  it('names each niqqud as the table of niqqud does, and links to that table', () => {
    expect(vowelName('חטף-פתח')).toBe('חטף פתח');
    expect(existsSync(`src/content/pages${NIQQUD_PAGE.slice(0, -1)}.mdoc`)).toBe(true);
  });
});

describe('a niqqud round', () => {
  it('asks ten different niqqud, with four different options each', () => {
    const round = buildRound(list, [], new Set(), { preparedCount: 0, groups: QUIZ_VOWELS });
    expect(round).toHaveLength(10);
    // Never the קמץ קטן, which only the vowel-class quiz asks about.
    for (const q of round) expect(ids).toContain(q.answer);
    expect(new Set(round.map((q) => q.answer)).size).toBe(10);
    for (const q of round) {
      const options = chooseOptions(NIQQUD_QUIZ, q.answer, 3);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(q.answer);
    }
  });
});

describe('the vowel-class quiz', () => {
  it('names a class for every niqqud of the list but the שווא, using each class', () => {
    const groups: readonly string[] = NIQQUD_GROUPS;
    expect(Object.keys(VOWEL_CLASS_OF).toSorted()).toEqual(
      groups.filter((id) => id !== 'שווא').toSorted(),
    );
    expect(new Set(Object.values(VOWEL_CLASS_OF))).toEqual(new Set(VOWEL_CLASSES));
  });

  it('asks ten different niqqud, the קמץ קטן among them, each about its class', () => {
    const groups = Object.keys(VOWEL_CLASS_OF);
    expect(list.items['קמץ-קטן']?.length ?? 0).toBeGreaterThanOrEqual(MIN_RANDOM);
    const round = buildRound(list, [], new Set(), {
      preparedCount: 0,
      groups,
      answerOf: (group) => VOWEL_CLASS_OF[group] ?? '',
    });
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.group)).size).toBe(10);
    for (const q of round) expect(q.answer).toBe(VOWEL_CLASS_OF[q.group]);
  });
});

describe('the qamats quiz', () => {
  const qamats = qamatsList as WordList;

  it('has both kinds, each marking a qamats in a word with its cantillation', () => {
    for (const kind of QAMATS_KINDS) {
      const items = qamats.items[kind] ?? [];
      expect(items.length, kind).toBeGreaterThanOrEqual(MIN_RANDOM);
      for (const { w, h = [0, 0] } of items) expect(w.slice(h[0], h[1]), w).toContain('ָ');
    }
    // The cantillation is kept: the stress tells the kinds apart.
    expect(
      Object.values(qamats.items)
        .flat()
        .some(({ w }) => /[֑-֯]/.test(w)),
    ).toBe(true);
  });

  it('asks each group once unless told otherwise', () => {
    const round = buildRound(qamats, [], new Set(), { preparedCount: 0 });
    expect(round).toHaveLength(2);
  });

  it('asks five of each kind in a round', () => {
    const round = buildRound(qamats, [], new Set(), { preparedCount: 0, perGroup: 5 });
    expect(round).toHaveLength(10);
    for (const kind of QAMATS_KINDS) expect(round.filter((q) => q.answer === kind)).toHaveLength(5);
    expect(new Set(round.map((q) => q.item.w)).size).toBe(10);
  });
});

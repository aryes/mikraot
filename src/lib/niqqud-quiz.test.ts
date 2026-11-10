import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import wordList from '../../public/quiz/niqqud-words.json';
import { MIN_RANDOM, buildRound, chooseOptions, type WordList } from './quiz';
import { NIQQUD_PAGE, NIQQUD_QUIZ, QUIZ_VOWELS, VOWEL_LOOK_ALIKES, vowelName } from './niqqud-quiz';

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
    const round = buildRound(list, [], new Set(), { preparedCount: 0 });
    expect(round).toHaveLength(10);
    expect(new Set(round.map((q) => q.answer)).size).toBe(10);
    for (const q of round) {
      const options = chooseOptions(NIQQUD_QUIZ, q.answer, 3);
      expect(new Set(options).size).toBe(4);
      expect(options).toContain(q.answer);
    }
  });
});

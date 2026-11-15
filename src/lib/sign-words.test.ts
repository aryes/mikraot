import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIN_RANDOM } from './quiz';
import { TOO_RARE, WORD_SIGN_KIND, WORD_TROPES, wordFor } from './sign-words';
import { SIGNED_TROPES } from './trope-signs';

const list: { items: Record<string, { w: string }[]> } = JSON.parse(
  readFileSync('public/quiz/trope-words.json', 'utf8'),
);

describe('the sign quiz with words', () => {
  it('leaves out exactly the tropes the word list has too few words for', () => {
    const few = SIGNED_TROPES.filter((id) => (list.items[id]?.length ?? 0) < MIN_RANDOM);
    expect(few.toSorted()).toEqual(TOO_RARE.toSorted());
    for (const id of WORD_TROPES) expect(list.items[id]?.length).toBeGreaterThanOrEqual(MIN_RANDOM);
  });

  it('offers look-alikes only among its own tropes', () => {
    for (const group of WORD_SIGN_KIND.lookAlikes) {
      for (const id of group) expect(WORD_TROPES).toContain(id);
    }
  });

  it('chooses the same word for the same question and option, and different ones otherwise', () => {
    const words = (list.items['פשטא'] ?? []).map((item) => item.w);
    expect(wordFor(words, 'q1|פשטא')).toBe(wordFor(words, 'q1|פשטא'));
    const chosen = new Set(Array.from({ length: 20 }, (_, i) => wordFor(words, `q${i}|פשטא`)));
    expect(chosen.size).toBeGreaterThan(10);
    expect(wordFor([], 'x')).toBeUndefined();
  });
});

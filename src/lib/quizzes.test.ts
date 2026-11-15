import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import menu from '../data/menu.json';
import type { MenuEntry } from '../types';
import { QUIZ_STORAGE, QUIZZES_PAGE } from './quizzes';

const quizzes = (menu.items as readonly MenuEntry[]).find((entry) => entry.title === 'חידונים');

describe('the quizzes page', () => {
  it('knows every quiz in the menu, by the storage name its component uses', () => {
    const urls = (quizzes?.children ?? []).map((entry) => entry.url);
    expect(new Set(urls)).toEqual(new Set(Object.keys(QUIZ_STORAGE)));
    // Each quiz component's storage name; and one that fixes its options has no levels (a quiz
    // may have none for another reason: the "why" qamats quiz's four rules always show).
    const components = readdirSync('src/components')
      .filter((file) => file.endsWith('Quiz.tsx') && file !== 'Quiz.tsx')
      .map((file) => {
        const source = readFileSync(`src/components/${file}`, 'utf8');
        return {
          storage: /storage: '([^']+)'/u.exec(source)?.[1] ?? '',
          fixed: /^ {2}options: /mu.test(source),
        };
      });
    const entries = Object.values(QUIZ_STORAGE);
    expect(new Set(components.map((entry) => entry.storage))).toEqual(
      new Set(entries.map((entry) => entry.storage)),
    );
    for (const { storage, fixed } of components) {
      if (fixed) expect(entries.find((entry) => entry.storage === storage)?.levels).toBe(false);
    }
  });

  it('is the page of the menu entry "חידונים" itself', () => {
    expect(quizzes?.url).toBe(QUIZZES_PAGE);
  });
});

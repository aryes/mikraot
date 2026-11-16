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
    // Each quiz component's storage name.
    const components = readdirSync('src/components')
      .filter((file) => file.endsWith('Quiz.tsx') && file !== 'Quiz.tsx')
      .map(
        (file) =>
          /storage: '([^']+)'/u.exec(readFileSync(`src/components/${file}`, 'utf8'))?.[1] ?? '',
      );
    expect(new Set(components)).toEqual(
      new Set(Object.values(QUIZ_STORAGE).map((entry) => entry.storage)),
    );
  });

  it('is the page of the menu entry "חידונים" itself', () => {
    expect(quizzes?.url).toBe(QUIZZES_PAGE);
  });
});

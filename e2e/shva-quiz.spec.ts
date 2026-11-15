import { expect, test } from '@playwright/test';
import { NA_REASONS } from '../src/lib/shva-quiz';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';

const QUIZ = `/${encodeURI('שווא-נע-או-נח')}/`;

test('the shva quiz runs a round of ten, five of each kind, every rule of a שווא נע explained', async ({
  page,
}) => {
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  const options = quiz.locator('.grid button');
  const next = quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ });
  const reasons = new Set<string>();
  const all = Object.values(NA_REASONS);

  /* oxlint-disable no-await-in-loop -- one question after another */
  for (let i = 1; i <= 10; i++) {
    await expect(quiz).toContainText(`שאלה ${i} מתוך 10`);
    await expect(quiz).toContainText('איזה שווא מסומן כאן?');
    // One letter marked, with its shva.
    await expect(quiz.locator('.mark-highlight')).toContainText('ְ');
    await expect(options).toHaveText(['שווא נע', 'שווא נח']);
    await options.first().click();
    const feedback = (await quiz.locator('[aria-live] p').first().innerText()).trim();
    const [opening = '', rest] = feedback.split(' השווא כאן: ');
    expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
    // The feedback says why a שווא is נע (the page's rule), and nothing for a שווא נח.
    for (const line of await quiz.locator('[aria-live] p').allInnerTexts()) {
      expect(line).not.toContain('למה נח');
      const reason = line.trim().replace(/^למה נע\? /u, '');
      if (all.includes(reason)) reasons.add(reason);
    }
    await expect(quiz.getByRole('link', { name: 'לדף על שווא נע' })).toHaveAttribute(
      'href',
      `/${encodeURI('שווא-נע')}/`,
    );
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  expect([...reasons].toSorted()).toEqual(all.toSorted());
  // Its own memory: keys are kind|word|letters, five of each kind.
  const recent = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('shva-quiz-recent') ?? '[]'),
  );
  expect(recent).toHaveLength(10);
  expect(recent.filter((key: string) => key.startsWith('שווא-נע|'))).toHaveLength(5);
  expect(await page.evaluate(() => localStorage.getItem('trope-quiz-recent'))).toBeNull();
});

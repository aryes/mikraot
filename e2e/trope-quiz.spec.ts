import { expect, test } from '@playwright/test';
import { CHEERS } from '../src/lib/trope-quiz';

const QUIZ = `/${encodeURI('זיהוי-טעמים')}/`;

test('the trope quiz runs a round of ten tropes, explains each answer, ranks the score and remembers what it asked', async ({
  page,
}) => {
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  const options = quiz.locator('.grid button');
  const next = quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ });

  /* oxlint-disable no-await-in-loop -- one question after another */
  for (let i = 1; i <= 10; i++) {
    await expect(quiz).toContainText(`שאלה ${i} מתוך 10`);
    await expect(options).toHaveCount(4);
    await options.first().click();
    // Right: a cheer; wrong: a kind word and the right name. Either way, a link to its page.
    const feedback = (await quiz.locator('[aria-live] p').first().innerText()).trim();
    if (feedback.includes('הטעם כאן:')) expect(feedback).toMatch(/^(לא הפעם\.|כמעט)/);
    else expect(CHEERS).toContain(feedback);
    await expect(quiz.getByRole('link', { name: /לדף הטעם/ })).toHaveAttribute('href', /^\//);
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  // The rank, linked to its place in the trope hierarchy.
  await expect(quiz.getByRole('status').locator('a[href^="/trope-hierarchy/#"]')).toHaveCount(1);
  const recent = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('trope-quiz-recent') ?? '[]'),
  );
  expect(recent).toHaveLength(10);
  // Keys are trope|word: no trope twice in a round.
  expect(new Set(recent.map((key: string) => key.split('|')[0])).size).toBe(10);
  await quiz.getByRole('button', { name: 'סבב נוסף' }).click();
  await expect(quiz).toContainText('שאלה 1 מתוך 10');
});

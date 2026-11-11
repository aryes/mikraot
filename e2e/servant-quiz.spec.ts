import { expect, test } from '@playwright/test';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';

const QUIZ = `/${encodeURI('זיהוי-משרתים')}/`;

test('the servant quiz runs a round of ten, the first of two words marked, and tells each servant', async ({
  page,
}) => {
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  const options = quiz.locator('.grid button');
  const next = quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ });

  /* oxlint-disable no-await-in-loop -- one question after another */
  for (let i = 1; i <= 10; i++) {
    await expect(quiz).toContainText(`שאלה ${i} מתוך 10`);
    await expect(quiz).toContainText('איזה משרת חסר במילה המסומנת?');
    // The first word marked: a word without any trope sign (a meteg or a sof pasuq may stay).
    const marked = (await quiz.locator('.mark-highlight').innerText()).trim();
    expect(marked).not.toMatch(/[֑-֯]/u);
    await expect(options).toHaveCount(4);
    await options.first().click();
    const feedback = (await quiz.locator('[aria-live] p').first().innerText()).trim();
    const [opening = '', rest] = feedback.split(' המשרת כאן: ');
    expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
    await expect(quiz.getByRole('link', { name: /לדף הטעם/ })).toHaveAttribute('href', /^\//);
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  // Its own memory, apart from the trope quiz's: keys are servant|words|letters.
  const recent = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('servant-quiz-recent') ?? '[]'),
  );
  expect(recent).toHaveLength(10);
  expect(await page.evaluate(() => localStorage.getItem('trope-quiz-recent'))).toBeNull();
});

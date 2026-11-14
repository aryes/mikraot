import { expect, test } from '@playwright/test';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';

const QUIZ = `/${encodeURI('סימן-הטעם')}/`;

test('the sign quiz runs a round of ten names, four signs each', async ({ page }) => {
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  const options = quiz.locator('.grid button');
  const next = quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ });

  /* oxlint-disable no-await-in-loop -- one question after another */
  for (let i = 1; i <= 10; i++) {
    await expect(quiz).toContainText(`שאלה ${i} מתוך 10`);
    await expect(quiz).toContainText('מה הסימן של הטעם?');
    // Four signs, each numbered for a screen reader (the sign alone means nothing read aloud).
    await expect(options).toHaveCount(4);
    await expect(options.first()).toHaveAccessibleName(/^סימן [1-4]$/);
    await options.first().click();
    const feedback = (await quiz.locator('[aria-live] p').first().innerText()).trim();
    const [opening = '', rest] = feedback.split(' הסימן של ');
    expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
    await expect(quiz.getByRole('link', { name: /^לדף הטעם/ })).toBeVisible();
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
});

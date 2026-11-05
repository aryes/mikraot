import { expect, test } from '@playwright/test';

const QUIZ = `/${encodeURI('זיהוי-טעמים')}/`;

test('the trope quiz runs a round of ten, explains each answer and remembers what it asked', async ({
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
    // Right or wrong, the answer is explained and links to the trope's page.
    await expect(quiz.locator('[aria-live]')).toContainText(/נכון!|לא נכון\. הטעם כאן:/);
    await expect(quiz.getByRole('link', { name: /לדף הטעם/ })).toHaveAttribute('href', /^\//);
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  const recent = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('trope-quiz-recent') ?? '[]'),
  );
  expect(recent).toHaveLength(10);
  await quiz.getByRole('button', { name: 'סבב נוסף' }).click();
  await expect(quiz).toContainText('שאלה 1 מתוך 10');
});

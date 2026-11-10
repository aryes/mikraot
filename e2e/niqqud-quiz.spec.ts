import { expect, test } from '@playwright/test';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';

const QUIZ = `/${encodeURI('זיהוי-ניקוד')}/`;

test('the niqqud quiz runs a round of ten, a letter marked in each word, and tells each answer', async ({
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
    await expect(quiz).toContainText('איזה ניקוד מסומן כאן?');
    // One or two letters of the word marked, with no cantillation on them.
    const marked = (await quiz.locator('.mark-highlight').innerText()).trim();
    expect(marked).toMatch(/^[ְ-ּׁׂא-ת]{1,6}$/u);
    await expect(options).toHaveCount(4);
    await options.first().click();
    const feedback = (await quiz.locator('[aria-live] p').first().innerText()).trim();
    const [opening = '', rest] = feedback.split(' הניקוד כאן: ');
    expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
    await expect(quiz.getByRole('link', { name: 'לטבלת הניקוד' })).toHaveAttribute(
      'href',
      `/${encodeURI('תנועות-עיצורים-וניקוד')}/`,
    );
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  // Its own memory, apart from the trope quiz's: keys are niqqud|word|letters, no niqqud twice.
  const recent = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('niqqud-quiz-recent') ?? '[]'),
  );
  expect(recent).toHaveLength(10);
  expect(new Set(recent.map((key: string) => key.split('|')[0])).size).toBe(10);
  expect(await page.evaluate(() => localStorage.getItem('trope-quiz-recent'))).toBeNull();
});

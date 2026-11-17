import { expect, test } from '@playwright/test';
import { GADOL_REASONS, QATAN_REASONS } from '../src/lib/niqqud-quiz';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';

const QUIZ = `/${encodeURI('קמץ-גדול-או-קטן')}/`;

test('the qamats quiz runs a round of ten, five of each kind, every rule explained', async ({
  page,
}) => {
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  const options = quiz.locator('.grid button');
  const next = quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ });
  const reasons = new Set<string>();
  const all = [...Object.values(QATAN_REASONS), ...Object.values(GADOL_REASONS)];

  /* oxlint-disable no-await-in-loop -- one question after another */
  for (let i = 1; i <= 10; i++) {
    await expect(quiz).toContainText(`שאלה ${i} מתוך 10`);
    await expect(quiz).toContainText('איזה קמץ מסומן כאן?');
    // One letter marked, with its qamats (and maybe a trope or meteg).
    await expect(quiz.locator('.mark-highlight')).toContainText('ָ');
    await expect(options).toHaveText(['קמץ גדול', 'קמץ קטן']);
    await options.first().click();
    const feedback = (await quiz.locator('[aria-live] > div').first().innerText()).trim();
    const [opening = '', rest] = feedback.split(' הקמץ כאן: ');
    expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
    // A קמץ קטן's feedback says why: the rule of the page that makes it one; so does the tricky
    // קמץ גדול's.
    for (const line of await quiz.locator('[aria-live] > div').allInnerTexts()) {
      const reason = line.trim().replace(/^למה (קטן|גדול)\? /u, '');
      if (all.includes(reason)) reasons.add(reason);
    }
    await expect(quiz.getByRole('link', { name: 'לדף על קמץ קטן' })).toHaveAttribute(
      'href',
      `/${encodeURI('קמץ-קטן')}/`,
    );
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  expect([...reasons].toSorted()).toEqual(all.toSorted());
  // Its own memory: keys are kind|word|letters, five of each kind.
  const recent = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('qamats-quiz-recent') ?? '[]'),
  );
  expect(recent).toHaveLength(10);
  expect(recent.filter((key: string) => key.startsWith('קמץ-קטן|'))).toHaveLength(5);
  expect(await page.evaluate(() => localStorage.getItem('trope-quiz-recent'))).toBeNull();
});

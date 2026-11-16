import { expect, test } from '@playwright/test';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';
import { readFileSync } from 'node:fs';
import { WORD_TROPES } from '../src/lib/sign-words';

const list: { items: Record<string, { w: string }[]> } = JSON.parse(
  readFileSync('public/quiz/trope-words.json', 'utf8'),
);
const WORDS = WORD_TROPES.flatMap((id) => (list.items[id] ?? []).map((item) => item.w));

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

test('the sign quiz can show words from the Torah as its answers, and remembers the choice', async ({
  page,
}) => {
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  // Signs on an א first, as before; words chosen on the start screen.
  const answers = quiz.getByRole('group', { name: 'מה מופיע בתשובות' });
  await expect(answers.getByRole('button', { name: 'סימן על א' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await answers.getByRole('button', { name: 'מילה מהתורה' }).click();
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  const options = quiz.locator('.grid button');
  await expect(options).toHaveCount(4);
  // Each a word (not a sign on an א), once the trope quiz's words have loaded; the same while the
  // question stays.
  await Promise.all((await options.all()).map((option) => expect(option).not.toHaveText(/^…$/u)));
  const shown = await options.allInnerTexts();
  // Each a word of the trope quiz's list, of a trope this level asks.
  for (const text of shown) expect(WORDS).toContain(text.trim());
  await options.first().click();
  await expect(quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ })).toBeVisible();
  expect(await options.allInnerTexts()).toEqual(shown);
  // The feedback names the trope alone, no word (Arye, 2026-11-16).
  const feedback = (await quiz.locator('[aria-live] p').first().innerText()).trim();
  const [opening = '', rest] = feedback.split(' הסימן הוא ');
  expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
  for (const text of shown) expect(feedback).not.toContain(text.trim());
  // Remembered: words again after a reload.
  await page.reload();
  // The quiz loads once it is on the screen (client:visible).
  await page.locator('astro-island').first().scrollIntoViewIfNeeded();
  await expect(answers.getByRole('button', { name: 'מילה מהתורה' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

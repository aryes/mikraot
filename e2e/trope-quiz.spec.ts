import { expect, test } from '@playwright/test';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/trope-quiz';

const QUIZ = `/${encodeURI('זיהוי-טעמים')}/`;

test('a challenge round starts on request, times each question, and remembers the choice', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await quiz.getByRole('button', { name: 'אתגר' }).click();
  await expect(quiz.getByRole('button', { name: 'אתגר' })).toHaveAttribute('aria-pressed', 'true');
  // The clock waits for the learner.
  await expect(quiz.getByRole('timer')).toHaveCount(0);
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  await expect(quiz.getByRole('timer')).toHaveText('15');
  // The time runs out: the question counts as wrong, and the answer is shown.
  await page.clock.fastForward(16_000);
  await expect(quiz.locator('[aria-live] p').first()).toContainText('נגמר הזמן. הטעם כאן:');
  // Back on the page later (a new tab: the mocked clock stays with this one), the challenge waits
  // for the learner before the clock starts.
  const later = await page.context().newPage();
  await later.goto(QUIZ);
  const again = later.locator('astro-island .not-prose');
  await again.scrollIntoViewIfNeeded(); // the quiz loads when it comes into view
  await expect(again.getByRole('button', { name: 'להתחיל' })).toBeVisible();
  await expect(again.locator('.grid button')).toHaveCount(0);
  await again.getByRole('button', { name: 'להתחיל' }).click();
  await expect(again.locator('.grid button')).toHaveCount(4);
  await again.getByRole('button', { name: 'רגילה' }).click();
  await expect(again.getByRole('timer')).toHaveCount(0);
});

test('the trope quiz runs a round of ten tropes, tells each answer, ranks the score and remembers what it asked', async ({
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
    const [opening = '', rest] = feedback.split(' הטעם כאן: ');
    expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
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

import { expect, test } from '@playwright/test';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';

const QUIZ = `/${encodeURI('זיהוי-טעמים')}/`;

test('the quiz starts with a time limit for every question, and remembers it', async ({ page }) => {
  await page.clock.install();
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  // No question until the learner starts; no limit unless chosen.
  await expect(quiz.locator('.grid button')).toHaveCount(0);
  await expect(quiz.getByRole('button', { name: 'בלי הגבלת זמן' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await quiz.getByRole('button', { name: '10 שניות' }).click();
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  await expect(quiz.getByRole('timer')).toHaveText('10');
  // The last three seconds are shown in red.
  await page.clock.fastForward(7_500);
  await expect(quiz.getByRole('timer')).toHaveText('3');
  await expect(quiz.getByRole('timer')).toHaveClass(/text-red-700/);
  // The time runs out: the question counts as wrong, and the answer is shown.
  await page.clock.fastForward(3_500);
  await expect(quiz.locator('[aria-live] p').first()).toContainText('נגמר הזמן. הטעם כאן:');
  // The next question has its own time.
  await quiz.getByRole('button', { name: 'לשאלה הבאה' }).click();
  await expect(quiz.getByRole('timer')).toHaveText('10');
  // Back later (a new tab: the mocked clock stays with this one): the choice is remembered.
  const later = await page.context().newPage();
  await later.goto(QUIZ);
  const again = later.locator('astro-island .not-prose');
  await again.scrollIntoViewIfNeeded(); // the quiz loads when it comes into view
  await expect(again.getByRole('button', { name: '10 שניות' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('the three-second limit turns red for its last two; a limit no longer offered becomes ten', async ({
  page,
}) => {
  await page.clock.install();
  // 15 seconds was offered before 2026-11-15.
  await page.addInitScript(() => localStorage.setItem('trope-quiz-time-limit', '15'));
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await expect(quiz.getByRole('button', { name: '10 שניות' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await quiz.getByRole('button', { name: '3 שניות' }).click();
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  await expect(quiz.getByRole('timer')).toHaveText('3');
  await expect(quiz.getByRole('timer')).not.toHaveClass(/text-red-700/);
  // 1.5 seconds: up to half a second of the test's own time still shows 2.
  await page.clock.fastForward(1_500);
  await expect(quiz.getByRole('timer')).toHaveText('2');
  await expect(quiz.getByRole('timer')).toHaveClass(/text-red-700/);
});

test('the trope quiz runs a round of ten tropes, tells each answer, ranks the score and remembers what it asked', async ({
  page,
}) => {
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  await expect(quiz.getByRole('timer')).toHaveCount(0);
  const options = quiz.locator('.grid button');
  const next = quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ });
  const missed: string[] = [];

  /* oxlint-disable no-await-in-loop -- one question after another */
  for (let i = 1; i <= 10; i++) {
    await expect(quiz).toContainText(`שאלה ${i} מתוך 10`);
    await expect(options).toHaveCount(4);
    await options.first().click();
    // Right: a cheer; wrong: a kind word and the right name. Either way, a link to its page.
    const feedback = (await quiz.locator('[aria-live] p').first().innerText()).trim();
    const [opening = '', rest] = feedback.split(' הטעם כאן: ');
    expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
    if (rest !== undefined) missed.push(rest);
    await expect(quiz.getByRole('link', { name: /לדף הטעם/ })).toHaveAttribute('href', /^\//);
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  // A mark for each question; a click shows it with its right answer, and a miss the learner's.
  const score = Number(/(\d+) מתוך/.exec(await quiz.getByRole('status').innerText())?.[1]);
  const marks = quiz.getByRole('list', { name: 'התשובות בסבב' }).getByRole('button');
  await expect(marks).toHaveCount(10);
  await expect(marks.filter({ hasText: ': נכון' })).toHaveCount(score);
  expect(missed).toHaveLength(10 - score);
  // The question opened shows in the place the marks control, a hint there until then.
  const panel = page.locator(`[id="${await marks.first().getAttribute('aria-controls')}"]`);
  await expect(panel).toContainText('לחצו על אחת התשובות');
  const wrong = marks.filter({ hasText: ': לא נכון' });
  /* oxlint-disable no-await-in-loop -- one mark after another, each opening its question */
  for (const [i, name] of missed.entries()) {
    await wrong.nth(i).click();
    await expect(wrong.nth(i)).toHaveAttribute('aria-expanded', 'true');
    // Focus stays on the mark, for the next one.
    await expect(wrong.nth(i)).toBeFocused();
    // As shown: each name is in the page in every tradition's spelling, CSS showing the chosen one.
    await expect(panel).toContainText(`התשובה הנכונה: ${name}`, { useInnerText: true });
    await expect(panel).toContainText(/עניתם: \S/u);
  }
  /* oxlint-enable no-await-in-loop */
  if (score > 0) {
    await marks.filter({ hasText: ': נכון' }).first().click();
    await expect(panel).toContainText('התשובה הנכונה:');
    await expect(panel).not.toContainText('עניתם');
  }
  // A second click closes it.
  const last = marks.last();
  await last.click();
  await last.click();
  await expect(last).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toContainText('לחצו על אחת התשובות');
  // The rank, linked to its place in the trope hierarchy.
  await expect(quiz.getByRole('status').locator('a[href^="/trope-hierarchy/#"]')).toHaveCount(1);
  const recent = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('trope-quiz-recent') ?? '[]'),
  );
  expect(recent).toHaveLength(10);
  // Keys are trope|word: no trope twice in a round.
  expect(new Set(recent.map((key: string) => key.split('|')[0])).size).toBe(10);
  // The round counts under its time limit too (none here), for the page of all the quizzes.
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('trope-quiz-stats') ?? '{}'),
  );
  expect(saved.byLimit).toEqual({ none: expect.objectContaining({ rounds: 1, asked: 10 }) });
  await quiz.getByRole('button', { name: 'סבב נוסף' }).click();
  await expect(quiz).toContainText('שאלה 1 מתוך 10');
  // Back to the start at any point, to choose again or to stop.
  await quiz.getByRole('button', { name: 'למסך הפתיחה' }).click();
  await expect(quiz.getByRole('button', { name: 'להתחיל' })).toBeFocused();
  // The learner's results so far, on the start screen; and a way to clear them.
  const stats = quiz.getByRole('region', { name: 'הנתונים שלכם' });
  await expect(stats).toContainText('סבבים שהושלמו: 1');
  await stats.getByRole('button', { name: 'לאפס את הנתונים' }).click();
  await expect(stats.getByRole('button', { name: 'לא' })).toBeFocused();
  await stats.getByRole('button', { name: 'למחוק' }).click();
  await expect(stats).toHaveCount(0);
  await expect(quiz.getByRole('button', { name: 'להתחיל' })).toBeFocused();
});

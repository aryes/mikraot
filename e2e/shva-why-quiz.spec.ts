import { expect, test } from '@playwright/test';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';
import { NA_RULES } from '../src/lib/shva-quiz';

const QUIZ = `/${encodeURI('למה-השווא-נע')}/`;
const RULES = Object.values(NA_RULES);

test('the "why" shva quiz asks for the rule of a שווא נע, two words by each rule', async ({
  page,
}) => {
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  const options = quiz.locator('.grid button');
  const next = quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ });
  const answers: string[] = [];

  /* oxlint-disable no-await-in-loop -- one question after another */
  for (let i = 1; i <= 10; i++) {
    await expect(quiz).toContainText(`שאלה ${i} מתוך 10`);
    // A shva marked, and four of the page's five rules.
    await expect(quiz.locator('.mark-highlight')).toContainText('ְ');
    await expect(options).toHaveCount(4);
    for (const text of await options.allInnerTexts()) expect(RULES).toContain(text.trim());
    const first = (await options.first().innerText()).trim();
    await options.first().click();
    const feedback = (await quiz.locator('[aria-live] > div').first().innerText()).trim();
    const [opening = '', rest] = feedback.split(' הכלל כאן: ');
    expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
    answers.push(rest ?? first);
    await expect(quiz.getByRole('link', { name: 'לכללי השווא הנע' })).toBeVisible();
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  // Every rule asked twice.
  for (const rule of RULES) expect(answers.filter((answer) => answer === rule)).toHaveLength(2);
});

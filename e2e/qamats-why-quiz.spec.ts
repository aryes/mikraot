import { expect, test } from '@playwright/test';
import { QATAN_PER_GROUP, QATAN_REASONS, QATAN_RULES } from '../src/lib/niqqud-quiz';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';

const QUIZ = `/${encodeURI('למה-הקמץ-קטן')}/`;
const RULES = Object.values(QATAN_RULES);

test('the "why" qamats quiz asks for the rule of a קמץ קטן, every rule in a round', async ({
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
    // A qamats marked, and the page's rules (all four, or fewer where another applies too).
    await expect(quiz.locator('.mark-highlight')).toContainText('ָ');
    for (const text of await options.allInnerTexts()) expect(RULES).toContain(text.trim());
    const first = (await options.first().innerText()).trim();
    await options.first().click();
    const feedback = (await quiz.locator('[aria-live] p').first().innerText()).trim();
    const [opening = '', rest] = feedback.split(' הכלל כאן: ');
    expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
    const rule = rest ?? first;
    answers.push(rule);
    // The rule named once, not again in full (Arye, 2026-11-16: repetitive).
    const id = Object.entries(QATAN_RULES).find(([, name]) => name === rule)?.[0] ?? '';
    await expect(quiz.locator('[aria-live]')).not.toContainText(QATAN_REASONS[id] ?? '-');
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  for (const [id, count] of Object.entries(QATAN_PER_GROUP)) {
    expect(answers.filter((answer) => answer === QATAN_RULES[id])).toHaveLength(count);
  }
});

import { expect, test } from '@playwright/test';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';

const QUIZ = `/${encodeURI('סוג-התנועה')}/`;

test('the vowel-class quiz runs a round of ten, three options each, and names the vowel in the feedback', async ({
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
    await expect(quiz).toContainText('מה סוג התנועה המסומנת?');
    // One or two letters of the word marked, with no cantillation on them.
    const marked = (await quiz.locator('.mark-highlight').innerText()).trim();
    expect(marked).toMatch(/^[ְ-ּׁׂא-ת]{1,6}$/u);
    await expect(options).toHaveText(['גדולה', 'קטנה', 'חטופה']);
    await options.first().click();
    const feedback = (await quiz.locator('[aria-live] p').first().innerText()).trim();
    // Right or wrong, the answer is named with its vowel: "קטנה (קמץ קטן)".
    const [opening = '', rest = ''] = feedback.split(' התנועה כאן: ');
    expect([...CHEERS, ...NEAR_MISSES, ...MISSES]).toContain(opening);
    expect(rest).toMatch(/^(גדולה|קטנה|חטופה) \([א-ת ]+\)$/);
    await expect(quiz.getByRole('link', { name: 'לטבלת הניקוד' })).toHaveAttribute(
      'href',
      `/${encodeURI('תנועות-עיצורים-וניקוד')}/`,
    );
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  // Its own memory, apart from the niqqud quiz's, whose words it shares.
  const recent = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('vowel-class-quiz-recent') ?? '[]'),
  );
  expect(recent).toHaveLength(10);
  expect(await page.evaluate(() => localStorage.getItem('niqqud-quiz-recent'))).toBeNull();
});

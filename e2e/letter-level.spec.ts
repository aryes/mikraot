import { expect, test } from '@playwright/test';
import { ON_ALEF } from '../src/lib/niqqud-quiz';
import { SIGNS } from '../src/lib/sign-quiz';

for (const [page_, signs] of [
  ['זיהוי-טעמים', Object.values(SIGNS)],
  ['זיהוי-ניקוד', Object.values(ON_ALEF)],
] as const) {
  test(`the one-letter level of ${page_} shows the answer on an א, and is remembered`, async ({
    page,
  }) => {
    await page.goto(`/${encodeURI(page_)}/`);
    const quiz = page.locator('astro-island .not-prose');
    await quiz.scrollIntoViewIfNeeded();
    const level = quiz.getByRole('group', { name: 'מה מופיע בשאלה' });
    await level.getByRole('button', { name: 'אות אחת' }).click();
    await expect(level.getByRole('button', { name: 'אות אחת' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await quiz.getByRole('button', { name: 'להתחיל' }).click();
    /* oxlint-disable no-await-in-loop -- one question after another */
    for (let i = 1; i <= 3; i++) {
      await expect(quiz).toContainText(`שאלה ${i} מתוך 10`);
      const shown = (await quiz.locator('[tabindex="-1"]').innerText()).trim();
      expect(signs).toContain(shown);
      await quiz.locator('.grid button').first().click();
      await quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ }).click();
    }
    /* oxlint-enable no-await-in-loop */
    await page.reload();
    await expect(
      page
        .locator('astro-island .not-prose')
        .getByRole('group', { name: 'מה מופיע בשאלה' })
        .getByRole('button', { name: 'אות אחת' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
}

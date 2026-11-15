import { expect, test } from '@playwright/test';
import { ON_ALEF, VOWEL_PARTNERS, pointedName } from '../src/lib/niqqud-quiz';
import { SIGNS } from '../src/lib/trope-signs';

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

test('on one letter, the partner of a vowel is always among the options', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('niqqud-quiz-letter', 'true'));
  await page.goto(`/${encodeURI('זיהוי-ניקוד')}/`);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  let partners = 0;
  /* oxlint-disable no-await-in-loop -- one question after another */
  for (let i = 1; i <= 10; i++) {
    await expect(quiz).toContainText(`שאלה ${i} מתוך 10`);
    const shown = (await quiz.locator('[tabindex="-1"]').innerText()).trim();
    const answer = Object.entries(ON_ALEF).find(([, drawn]) => drawn === shown)?.[0] ?? '';
    expect(answer).not.toBe('');
    const partner = VOWEL_PARTNERS[answer];
    if (partner) {
      partners++;
      // Exactly the name: פתח is inside חטף פתח.
      expect(await quiz.locator('.grid button').allInnerTexts()).toContain(pointedName(partner));
    }
    await quiz.locator('.grid button').first().click();
    await quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ }).click();
  }
  /* oxlint-enable no-await-in-loop */
  // Ten of the fourteen vowels have one: a round of ten asks some of them.
  expect(partners).toBeGreaterThan(0);
});

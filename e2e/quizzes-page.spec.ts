import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGE = `/${encodeURI('חידונים')}/`;

test('the quizzes page lists every quiz, with what this browser remembers of each', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'trope-quiz-stats',
      JSON.stringify({
        rounds: 3,
        asked: 30,
        right: 22,
        best: 9,
        answers: {},
        byLimit: {
          '5': { rounds: 2, asked: 20, right: 15, best: 9 },
          none: { rounds: 1, asked: 10, right: 7, best: 7 },
        },
      }),
    );
    localStorage.setItem('trope-quiz-level', '2');
    localStorage.setItem(
      'dagesh-quiz-stats',
      JSON.stringify({
        rounds: 1,
        asked: 10,
        right: 10,
        best: 10,
        answers: {},
        byLimit: { '3': { rounds: 1, asked: 10, right: 10, best: 10 } },
      }),
    );
  });
  // The built page has only the links: what was played is this browser's to say.
  const built = await (await page.request.get(PAGE)).text();
  expect(built).not.toContain('עוד לא שיחקתם');
  await page.goto(PAGE);
  const list = page.locator('astro-island ul').first();
  await list.scrollIntoViewIfNeeded();
  const tropes = list.locator(':scope > li').filter({ hasText: 'זיהוי טעמים' });
  // Each time limit played, a row of its own (Arye, 2026-11-15); not the options' level (Arye,
  // 2026-11-16: not for the learner to see).
  const rows = tropes.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator('td')).toHaveText(['5 שניות', '2', '75%', '9 מתוך 10']);
  await expect(rows.nth(1).locator('td')).toHaveText(['בלי הגבלה', '1', '70%', '7 מתוך 10']);
  await expect(tropes).not.toContainText('רמת הקושי');
  // The tables appear only with results: checked here, in light and dark (accessibility.spec.ts
  // sees the page without them).
  /* oxlint-disable no-await-in-loop -- one colour scheme, then the other */
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const results = await new AxeBuilder({ page })
      .include('astro-island')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.map((v) => `${colorScheme} ${v.id}`)).toEqual([]);
  } /* oxlint-enable no-await-in-loop */

  const dagesh = list.locator(':scope > li').filter({ hasText: 'דגש חזק או קל' });
  await expect(dagesh.locator('tbody td')).toHaveText(['3 שניות', '1', '100%', '10 מתוך 10']);
  // A quiz not played yet: its link, and no results.
  const niqqud = list.locator(':scope > li').filter({ hasText: 'זיהוי ניקוד' });
  await expect(niqqud).toContainText('עוד לא שיחקתם.');
  await expect(page.getByText('התוצאות נשמרות רק בדפדפן הזה.')).toBeVisible();
  await niqqud.getByRole('link', { name: 'זיהוי ניקוד' }).click();
  await expect(page).toHaveURL(new RegExp(`${encodeURI('זיהוי-ניקוד')}/$`, 'u'));
  // And back, from the quiz's start screen.
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await quiz.getByRole('link', { name: 'לכל החידונים והתוצאות שלכם' }).click();
  await expect(page).toHaveURL(new RegExp(`${PAGE}$`, 'u'));
});

test('the quizzes page clears every quiz’s results at once, asking first', async ({ page }) => {
  await page.goto(PAGE);
  // Set once (not on every load), so a reload shows what the reset left.
  await page.evaluate(() => {
    // oxlint-disable-next-line unicorn/consistent-function-scoping -- runs in the page, alone
    const stats = (asked: number) =>
      JSON.stringify({
        rounds: 1,
        asked,
        right: 5,
        best: 5,
        answers: {},
        byLimit: { none: { rounds: 1, asked, right: 5, best: 5 } },
      });
    localStorage.setItem('trope-quiz-stats', stats(10));
    localStorage.setItem('dagesh-quiz-stats', stats(10));
    localStorage.setItem('trope-quiz-level', '2');
  });
  await page.reload();
  const island = page.locator('astro-island').first();
  await island.scrollIntoViewIfNeeded();
  await expect(island.locator('tbody tr')).toHaveCount(2);
  const reset = page.getByRole('button', { name: 'לאפס את הנתונים של כל החידונים' });
  await reset.click();
  // Asked once more; "לא" keeps them.
  await expect(page.getByRole('button', { name: 'לא' })).toBeFocused();
  await page.getByRole('button', { name: 'לא' }).click();
  await expect(island.locator('tbody tr')).toHaveCount(2);
  await reset.click();
  await page.getByRole('button', { name: 'למחוק' }).click();
  const done = island.getByRole('status');
  await expect(done).toHaveText('הנתונים של כל החידונים נמחקו.');
  await expect(done).toBeFocused();
  await expect(island.locator('tbody tr')).toHaveCount(0);
  await expect(reset).toHaveCount(0);
  // The results only: the level stays, as with each quiz's own reset.
  await page.reload();
  await island.scrollIntoViewIfNeeded();
  await expect(island.locator(':scope li').filter({ hasText: 'זיהוי טעמים' })).toContainText(
    'עוד לא שיחקתם.',
  );
  expect(await page.evaluate(() => localStorage.getItem('trope-quiz-level'))).toBe('2');
});

test('a page links at its end to the quizzes that practise it', async ({ page }) => {
  await page.goto(`/${encodeURI('שווא-נע')}/`);
  const box = page.getByRole('complementary', { name: 'לתרגול:' });
  await expect(box.getByRole('link')).toHaveText(['שווא נע או נח?', 'למה השווא נע?']);
  await box.getByRole('link', { name: 'למה השווא נע?' }).click();
  await expect(page).toHaveURL(new RegExp(`/${encodeURI('למה-השווא-נע')}/$`, 'u'));
});

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
    localStorage.setItem('dagesh-quiz-level', '3');
  });
  // The built page has only the links: what was played is this browser's to say.
  const built = await (await page.request.get(PAGE)).text();
  expect(built).not.toContain('עוד לא שיחקתם');
  await page.goto(PAGE);
  const list = page.locator('astro-island ul').first();
  await list.scrollIntoViewIfNeeded();
  const tropes = list.locator(':scope > li').filter({ hasText: 'זיהוי טעמים' });
  // Each time limit played, a row of its own (Arye, 2026-11-15), and the options' level.
  const rows = tropes.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).locator('td')).toHaveText(['5 שניות', '2', '75%', '9 מתוך 10']);
  await expect(rows.nth(1).locator('td')).toHaveText(['בלי הגבלה', '1', '70%', '7 מתוך 10']);
  await expect(tropes).toContainText('רמת הקושי: 3 מתוך 4');
  // A quiz whose options are fixed (two kinds) has no levels.
  const dagesh = list.locator(':scope > li').filter({ hasText: 'דגש חזק או קל' });
  await expect(dagesh.locator('tbody td')).toHaveText(['3 שניות', '1', '100%', '10 מתוך 10']);
  await expect(dagesh).not.toContainText('רמת הקושי');
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

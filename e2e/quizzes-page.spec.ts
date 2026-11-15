import { expect, test } from '@playwright/test';

const PAGE = `/${encodeURI('חידונים')}/`;

test('the quizzes page lists every quiz, with what this browser remembers of each', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'trope-quiz-stats',
      JSON.stringify({ rounds: 2, asked: 20, right: 15, best: 9, answers: {} }),
    );
    localStorage.setItem('trope-quiz-level', '2');
    localStorage.setItem('trope-quiz-time-limit', '5');
    localStorage.setItem(
      'dagesh-quiz-stats',
      JSON.stringify({ rounds: 1, asked: 10, right: 10, best: 10, answers: {} }),
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
  await expect(tropes).toContainText('סבבים שהושלמו: 2');
  await expect(tropes).toContainText('תשובות נכונות: 75%');
  await expect(tropes).toContainText('הסבב הטוב ביותר: 9 מתוך 10');
  await expect(tropes).toContainText('רמת הקושי: 3 מתוך 4');
  await expect(tropes).toContainText('זמן לשאלה: 5 שניות');
  // A quiz whose options are fixed (two kinds) has no levels.
  const dagesh = list.locator(':scope > li').filter({ hasText: 'דגש חזק או קל' });
  await expect(dagesh).toContainText('הסבב הטוב ביותר: 10 מתוך 10');
  await expect(dagesh).not.toContainText('רמת הקושי');
  // A quiz not played yet: its link, and no results.
  const niqqud = list.locator(':scope > li').filter({ hasText: 'זיהוי ניקוד' });
  await expect(niqqud).toContainText('עוד לא שיחקתם.');
  await niqqud.getByRole('link', { name: 'זיהוי ניקוד' }).click();
  await expect(page).toHaveURL(new RegExp(`${encodeURI('זיהוי-ניקוד')}/$`, 'u'));
  // And back, from the quiz's start screen.
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  await quiz.getByRole('link', { name: 'לכל החידונים והתוצאות שלכם' }).click();
  await expect(page).toHaveURL(new RegExp(`${PAGE}$`, 'u'));
});

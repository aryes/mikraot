import { expect, test } from '@playwright/test';
import { LOCAL_ONLY } from './tags';

const QUIZ = `/${encodeURI('זיהוי-טעמים')}/`;

test(
  "two learners play the same round and see each other's answers",
  LOCAL_ONLY,
  async ({ browser }) => {
    const host = await (await browser.newContext()).newPage();
    await host.goto(QUIZ);
    const hostQuiz = host.locator('astro-island .not-prose');
    await hostQuiz.scrollIntoViewIfNeeded();
    await hostQuiz.getByRole('button', { name: 'לשחק עם חברים' }).click();
    await hostQuiz.getByLabel('השם שלכם (רשות)').fill('דנה');
    await hostQuiz.getByRole('button', { name: 'לפתוח חדר' }).click();
    const link = encodeURI(await hostQuiz.getByLabel('הקישור לחידון').inputValue());
    expect(link).toMatch(/[?&]duel=[\w-]{22}$/);
    // The host can't start alone.
    await expect(hostQuiz.getByRole('button', { name: 'להתחיל' })).toBeDisabled();

    // A friend opens the link, in a browser of their own.
    const guest = await (await browser.newContext()).newPage();
    await guest.goto(link);
    const guestQuiz = guest.locator('astro-island .not-prose');
    await guestQuiz.scrollIntoViewIfNeeded();
    await guestQuiz.getByLabel('השם שלכם (רשות)').fill('יוסי');
    await guestQuiz.getByRole('button', { name: 'להצטרף' }).click();
    await expect(guestQuiz).toContainText('ממתינים שהחידון יתחיל');
    await expect(hostQuiz.getByRole('listitem')).toHaveText(['דנה (אתם)', 'יוסי']);
    await hostQuiz.getByRole('button', { name: 'להתחיל' }).click();

    // The same word and options for both.
    const word = (quiz: typeof hostQuiz) => quiz.locator('[aria-describedby]').innerText();
    const options = (quiz: typeof hostQuiz) => quiz.locator('.grid button').allInnerTexts();
    await expect(guestQuiz).toContainText('שאלה 1 מתוך 10');
    expect(await word(guestQuiz)).toBe(await word(hostQuiz));
    expect(await options(guestQuiz)).toEqual(await options(hostQuiz));

    // The guest answers first: the host sees that they did, then whether they were right.
    await guestQuiz.locator('.grid button').first().click();
    const friend = hostQuiz.getByRole('list', { name: 'הניקוד בחדר' });
    await expect(friend.getByLabel('כבר יש תשובה')).toBeVisible();
    await hostQuiz.locator('.grid button').first().click();
    await expect(friend.getByLabel(/^(נכון|לא נכון)$/)).toBeVisible();
    await expect(friend.getByLabel('ענו לפניכם')).toBeVisible();

    // A latecomer can't join a round already started.
    const late = await (await browser.newContext()).newPage();
    await late.goto(link);
    const lateQuiz = late.locator('astro-island .not-prose');
    await lateQuiz.scrollIntoViewIfNeeded();
    await lateQuiz.getByRole('button', { name: 'להצטרף' }).click();
    await expect(lateQuiz).toContainText('החדר מלא, או שהחידון בו כבר התחיל.');
    // ...and goes back to the quiz on their own, the room gone from the address.
    await lateQuiz.getByRole('button', { name: 'לחידון לבד' }).click();
    await expect(lateQuiz.getByRole('button', { name: 'להתחיל' })).toBeVisible();
    expect(late.url()).not.toContain('duel=');
  },
);

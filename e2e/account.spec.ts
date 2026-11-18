import { expect, test, type Page } from '@playwright/test';
import { LOCAL_ONLY } from './tags';

/**
 * Signing in by an emailed link (src/server/auth.ts). Locally no email is sent: the page shows
 * the link (AUTH_SHOW_LINK in .dev.vars). Each run uses new addresses: a link can be asked for
 * once a minute per address.
 */
const address = (who: string) => `${who}-${Date.now()}@example.com`;

// The page asks the Worker who is signed in; a cold start under parallel test load can exceed the
// default 5 seconds.
const ANSWERED = { timeout: 15_000 };

async function askForLink(page: Page, email: string) {
  await page.goto('/account/');
  await page.getByRole('textbox', { name: 'אימייל' }).fill(email);
  await page.getByRole('button', { name: 'שלחו לי קישור' }).click();
  await expect(page.getByText('שלחנו קישור להתחברות אל')).toBeVisible(ANSWERED);
  const link = await page.getByRole('link', { name: 'הקישור' }).getAttribute('href');
  expect(link).toMatch(/\/account\/#signin=/);
  return link ?? '';
}

test('the account page offers signing in, and the header links to it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'התחברות' }).click();
  await expect(page).toHaveURL(/\/account\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('החשבון שלי');
  await expect(page.getByRole('button', { name: 'שלחו לי קישור' })).toBeVisible(ANSWERED);
});

test(
  'a learner signs in with a link, stays signed in, and signs out',
  LOCAL_ONLY,
  async ({ page }) => {
    const email = address('learner');
    const link = await askForLink(page, email);
    await page.goto(link);
    await expect(page.getByText(`מחוברים בתור:${email}`)).toBeVisible(ANSWERED);
    // The token is taken off the address.
    expect(new URL(page.url()).hash).toBe('');
    // The header shows it on every page, without asking the server.
    await page.goto('/');
    await expect(page.locator('[data-account-link]')).toHaveAttribute('data-signed-in', '');
    await page.goto('/account/');
    await expect(page.getByText(`מחוברים בתור:${email}`)).toBeVisible(ANSWERED);

    await page.getByRole('button', { name: 'התנתקות' }).click();
    await expect(page.getByRole('button', { name: 'שלחו לי קישור' })).toBeVisible(ANSWERED);
    await expect(page.locator('[data-account-link]')).not.toHaveAttribute('data-signed-in');
    // A link works once.
    await page.goto(link);
    await expect(page.getByText('הקישור כבר שימש או שעבר זמנו')).toBeVisible(ANSWERED);
  },
);

test('a learner deletes their account', LOCAL_ONLY, async ({ page }) => {
  const email = address('leaving');
  await page.goto(await askForLink(page, email));
  await expect(page.getByText(`מחוברים בתור:${email}`)).toBeVisible(ANSWERED);
  await page.getByRole('button', { name: 'מחיקת החשבון' }).click();
  await page.getByRole('button', { name: 'כן, למחוק' }).click();
  await expect(page.getByText('החשבון נמחק.')).toBeVisible(ANSWERED);
  const session: unknown = await (await page.request.get('/api/auth/get-session')).json();
  expect(session).toBeNull();
});

test('the sign-in API answers only the endpoints the site uses', async ({ request }) => {
  expect((await request.post('/api/auth/sign-up/email', { data: {} })).status()).toBe(404);
  expect((await request.get('/api/auth/list-sessions')).status()).toBe(404);
  expect((await request.get('/api/auth/get-session')).status()).toBe(200);
});

test('quiz results follow the account to another device', LOCAL_ONLY, async ({ page, browser }) => {
  // This browser played two rounds of the trope quiz before signing in.
  const tally = { rounds: 2, asked: 20, right: 15, best: 9 };
  const stats = { ...tally, answers: {}, byLimit: { none: tally } };
  await page.goto('/account/');
  await page.evaluate(
    (saved) => localStorage.setItem('trope-quiz-stats', saved),
    JSON.stringify(stats),
  );
  const email = address('two-devices');
  await page.goto(await askForLink(page, email));
  await expect(page.getByText(`מחוברים בתור:${email}`)).toBeVisible(ANSWERED);

  // Another device: the same account (its session), nothing of its own.
  const other = await browser.newContext({
    storageState: { cookies: await page.context().cookies(), origins: [] },
  });
  const phone = await other.newPage();
  await phone.goto('/account/');
  await expect(phone.getByText(`מחוברים בתור:${email}`)).toBeVisible(ANSWERED);
  await phone.goto(encodeURI('/חידונים/'));
  await expect(phone.getByText('התוצאות נשמרות בחשבון שלכם')).toBeVisible(ANSWERED);
  const results = phone
    .getByRole('region', { name: 'התוצאות בזיהוי טעמים' })
    .or(phone.getByLabel('התוצאות בזיהוי טעמים'));
  await expect(results.getByRole('cell').nth(1)).toHaveText('2', ANSWERED);

  // Signing out there leaves only that device's own results (none).
  await phone.goto('/account/');
  await phone.getByRole('button', { name: 'התנתקות' }).click();
  await phone.goto(encodeURI('/חידונים/'));
  await expect(phone.getByText('התוצאות נשמרות רק בדפדפן הזה')).toBeVisible(ANSWERED);
  await expect(phone.getByLabel('התוצאות בזיהוי טעמים')).toHaveCount(0);
  await other.close();
});

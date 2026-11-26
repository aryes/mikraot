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

test(
  "Google's button leads to Google's sign-in, for the site's app",
  LOCAL_ONLY,
  async ({ page }) => {
    // Stopped at Google: its page is not this site's to test.
    let google: URL | undefined;
    await page.route('https://accounts.google.com/**', async (route) => {
      google = new URL(route.request().url());
      await route.fulfill({ contentType: 'text/html', body: '<p>Google</p>' });
    });
    await page.goto('/account/');
    await page.getByRole('button', { name: 'התחברות עם Google' }).click();
    await expect(page.getByText('Google', { exact: true })).toBeVisible(ANSWERED);
    expect(google?.searchParams.get('client_id')).toBe('local-test-only');
    expect(google?.searchParams.get('prompt')).toBe('select_account');
    expect(google?.searchParams.get('redirect_uri')).toMatch(/\/api\/auth\/callback\/google$/);
    // Back from Google's page: the button works again.
    await page.goBack();
    await expect(page.getByRole('button', { name: 'התחברות עם Google' })).toBeEnabled(ANSWERED);
  },
);

test('back from Google: a failure says so, a refusal and a bare link say nothing', async ({
  page,
}) => {
  const failed = page.getByText('ההתחברות עם Google לא הצליחה');
  const form = page.getByRole('button', { name: 'שלחו לי קישור' });
  await page.goto('/account/?error=state_mismatch');
  await expect(failed).toBeVisible(ANSWERED);
  expect(new URL(page.url()).search).toBe('');
  await page.goto('/account/?error=access_denied');
  await expect(form).toBeVisible(ANSWERED);
  await expect(failed).toBeHidden();
  expect(new URL(page.url()).search).toBe('');
  // A link to the return address, not a return from Google this tab went to.
  await page.goto('/account/?signin=google');
  await expect(form).toBeVisible(ANSWERED);
  await expect(failed).toBeHidden();
  expect(new URL(page.url()).search).toBe('');
});

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

test(
  'quiz results played signed in follow the account; anonymous ones stay apart',
  LOCAL_ONLY,
  async ({ page, browser }) => {
    const quizzes = encodeURI('/חידונים/');

    // Signed in, this browser played two rounds of the trope quiz (as the quiz saves them).
    const email = address('two-devices');
    await page.goto(await askForLink(page, email));
    await expect(page.getByText(`מחוברים בתור:${email}`)).toBeVisible(ANSWERED);
    await page.evaluate(
      (saved) => localStorage.setItem('trope-quiz-stats-account', saved),
      played(2),
    );
    await page.goto(quizzes);
    await expect(page.getByText('התוצאות נשמרות בחשבון שלכם')).toBeVisible(ANSWERED);
    await expect(roundsOn(page)).toHaveText('2', ANSWERED);

    // As just after signing in again: the browser takes its row back from the account, not
    // sending an empty one over it.
    await page.evaluate(() => {
      localStorage.removeItem('trope-quiz-stats-account');
      localStorage.removeItem('quiz-resets-seen');
    });
    await page.reload();
    await expect(roundsOn(page)).toHaveText('2', ANSWERED);

    // Another device: the same account (its session), with five rounds played signed out, which
    // stay out of the account.
    const other = await browser.newContext({
      storageState: { cookies: await page.context().cookies(), origins: [] },
    });
    const phone = await other.newPage();
    await phone.goto('/account/');
    await phone.evaluate((saved) => localStorage.setItem('trope-quiz-stats', saved), played(5));
    await expect(phone.getByText(`מחוברים בתור:${email}`)).toBeVisible(ANSWERED);
    await phone.goto(quizzes);
    await expect(roundsOn(phone)).toHaveText('2', ANSWERED);

    // Signing out there: the account's results go, the anonymous ones show again.
    await phone.goto('/account/');
    await phone.getByRole('button', { name: 'התנתקות' }).click();
    await phone.goto(quizzes);
    await expect(phone.getByText('התוצאות נשמרות רק בדפדפן הזה')).toBeVisible(ANSWERED);
    await expect(roundsOn(phone)).toHaveText('5', ANSWERED);
    await other.close();
  },
); /** A quiz's results as the quiz saves them: some rounds played without a time limit. */
const played = (rounds: number) => {
  const tally = { rounds, asked: rounds * 10, right: rounds * 7, best: 9 };
  return JSON.stringify({ ...tally, answers: {}, byLimit: { none: tally } });
};
const roundsOn = (where: Page) =>
  where
    .getByRole('region', { name: 'התוצאות בזיהוי טעמים' })
    .or(where.getByLabel('התוצאות בזיהוי טעמים'))
    .getByRole('cell')
    .nth(1);

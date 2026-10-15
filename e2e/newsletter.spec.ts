import { expect, test } from '@playwright/test';
import { LOCAL_ONLY } from './tags';

// Local only: on the deployed site a sign-up makes Brevo send a real confirmation email.
test(
  'the footer newsletter form signs up, loading the human check only once used',
  LOCAL_ONLY,
  async ({ page }, testInfo) => {
    const checks: string[] = [];
    page.on('request', (sent) => {
      if (sent.url().includes('challenges.cloudflare.com')) checks.push(sent.url());
    });
    await page.goto('/about/');
    // Folded behind a button, which works once the form's script has loaded (in view).
    const open = page.getByRole('button', { name: 'הרשמה לעדכונים באימייל' });
    const form = page.getByRole('form', { name: 'עדכונים באימייל' });
    await open.scrollIntoViewIfNeeded();
    expect(checks).toEqual([]); // nothing loaded before the form is opened
    await expect(async () => {
      await open.click();
      await expect(form).toBeVisible({ timeout: 1000 });
    }).toPass();
    // The cursor is in the first field; "ביטול" folds it away again, back to the button.
    await expect(form.getByLabel(/שם/)).toBeFocused();
    await form.getByRole('button', { name: 'ביטול' }).click();
    await expect(form).toHaveCount(0);
    await expect(open).toBeFocused();
    await open.click();
    await expect(form).toBeVisible();

    const email = form.getByLabel('אימייל');
    await form.getByRole('button', { name: 'הרשמה' }).click();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(form.getByText('נא לכתוב כתובת אימייל תקינה')).toBeVisible();
    expect(checks).not.toEqual([]); // the click focused the form: the check is loading

    await form.getByLabel(/שם/).fill('בודק');
    // One sign-up a minute per address: each project and retry uses its own.
    const address = `tester-${testInfo.project.name}-${testInfo.retry}@example.com`;
    await email.fill(address);
    const sent = page.waitForRequest((r) => r.url().endsWith('/api/newsletter/'));
    await form.getByRole('button', { name: 'הרשמה' }).click();
    expect((await sent).postDataJSON()).toMatchObject({
      email: address,
      name: 'בודק',
    });
    const status = form.getByRole('status');
    await expect(status).toContainText('שלחנו אליכם אימייל עם קישור לאישור ההרשמה');
    await expect(status).toBeFocused();
  },
);

test('the newsletter API refuses junk and calls without a human check', async ({ request }) => {
  const post = (data: unknown) => request.post('/api/newsletter/', { data });
  expect((await post({ email: 'not an email' })).status()).toBe(400);
  expect((await post({ email: 'a@b.co', name: 'x'.repeat(200) })).status()).toBe(400);
  expect((await post({ email: 'a@b.co' })).status()).toBe(403); // no Turnstile token
});

test('Brevo webhook calls without the shared secret are refused', async ({ request }) => {
  const response = await request.post('/api/newsletter-webhook/', {
    data: { event: 'list_addition', email: 'a@b.co', list_id: [4] },
    headers: { 'x-webhook-secret': 'guess' },
  });
  expect(response.status()).toBe(403);
});

test('the confirmation page thanks the subscriber and stays out of search engines', async ({
  page,
}) => {
  await page.goto('/newsletter/confirmed/');
  await expect(page.getByRole('heading', { name: 'ההרשמה אושרה, תודה!' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('the unsubscribe page refuses a link that is not ours, and stays out of search engines', async ({
  page,
}) => {
  await page.goto('/newsletter/unsubscribe/?token=bm8.c2ln');
  await expect(page.getByText('הקישור אינו תקין')).toBeVisible();
  await expect(page.getByRole('button', { name: 'כן, לבטל את ההרשמה' })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test("a mail app's one-click unsubscribe gets the same answer for any token", async ({
  request,
}) => {
  const response = await request.post('/newsletter/unsubscribe/?token=bm8.c2ln', {
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    data: 'List-Unsubscribe=One-Click',
  });
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe('Unsubscribed');
});

test('the privacy policy is published and linked from the footer and both forms', async ({
  page,
}) => {
  const policy = await page.goto('/privacy-policy/');
  expect(policy?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('מדיניות הפרטיות');
  await page.goto('/about/');
  await expect(page.locator('footer a[href="/privacy-policy/"]')).toHaveCount(1); // bottom line
  // The comment form's link (the page's content has none of its own). First, as opening the
  // footer form below scrolls past the comments, which load on the way.
  const loaded = page.waitForResponse((r) => r.url().includes('/api/comments/') && r.ok());
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await loaded;
  await page.getByRole('button', { name: 'כתבו תגובה או שאלה' }).click();
  await expect(page.locator('main').getByRole('link', { name: 'מדיניות הפרטיות' })).toBeVisible();
  // The newsletter form's link, once it's opened (the button works once its script has loaded).
  await expect(async () => {
    await page.getByRole('button', { name: 'הרשמה לעדכונים באימייל' }).click();
    await expect(page.locator('footer a[href="/privacy-policy/"]')).toHaveCount(2, {
      timeout: 1000,
    });
  }).toPass();
});

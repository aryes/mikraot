import { expect, test } from '@playwright/test';

// Pages the Worker answers (not static files): a browser opening one must get the Worker's page.
// Until 2026-10-13 Cloudflare served the 404 page for these navigations (wrangler.jsonc,
// assets.run_worker_first; src/routes.test.ts checks that every such route is listed).
for (const [path, title] of [
  ['/unsubscribe/?token=x', 'הפסקת הודעות על תשובות'],
  ['/newsletter/unsubscribe/?token=x', 'ביטול ההרשמה לעדכונים'],
] as const) {
  test(`${path.split('?')[0]} opens in a browser`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  });
}

test('the comments feed opens in a browser', async ({ page }) => {
  const feed = await page.goto('/comments/feed/');
  expect(feed?.status()).toBe(200);
  expect(feed?.headers()['content-type']).toContain('xml');
});

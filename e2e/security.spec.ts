import { expect, test, type Page } from '@playwright/test';

/** Collects Content-Security-Policy violations reported in the console. */
function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/.test(message.text())) violations.push(message.text());
  });
  return violations;
}

test('security headers are sent', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response?.headers() ?? {};
  expect(headers['content-security-policy']).toBe("frame-ancestors 'none'");
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['strict-transport-security']).toContain('max-age=');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  await expect(page.locator('meta[http-equiv="content-security-policy"]')).toHaveAttribute(
    'content',
    /script-src 'self' 'wasm-unsafe-eval' 'sha256-/,
  );
});

test('features work under the CSP: comments, collapsibles, audio, embedded video', async ({
  page,
}) => {
  const violations = watchCsp(page);
  await page.goto('/טעמים/נוסח-אשכנז/');
  await page.locator('iframe[src*="youtube-nocookie.com"]').first().waitFor();
  await page.locator('.collapse-toggle-btn').first().click();
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await expect(page.getByText('קורא לדוגמה')).toBeVisible({ timeout: 15_000 });

  await page.goto('/דגש-קל/');
  await page.locator('.inline-audio-btn').first().click();
  await expect(page.locator('.inline-audio-btn .pause-icon:not(.hidden)')).toHaveCount(1);

  expect(violations).toEqual([]);
});

test('search (WebAssembly) and the video popup work under the CSP', async ({ page }) => {
  const violations = watchCsp(page);
  await page.goto('/קריאות-מוקלטות-בנוסח-אשכנז/');
  await page.keyboard.press('Control+k');
  await page.getByRole('searchbox').fill('שווא');
  await expect(page.getByRole('dialog').getByRole('link').first()).toBeVisible();
  await page.keyboard.press('Escape');

  await page.locator('.wp-content-rendered a[href*="youtu.be/"]').first().click();
  await expect(page.locator('dialog iframe[src*="youtube-nocookie.com"]')).toBeVisible();

  expect(violations).toEqual([]);
});

test('the comments API refuses junk: unknown pages, bots, oversized bodies', async ({
  request,
}) => {
  const post = (data: unknown) => request.post('/api/comments/', { data });
  const comment = { page_slug: 'דגש-קל', author_name: 'בודק', content: 'בדיקה' };
  expect((await post({ ...comment, page_slug: 'no/such/page' })).status()).toBe(400);
  expect((await post({ ...comment, website: 'https://spam.example' })).status()).toBe(400);
  expect((await post({ ...comment, content: 'x'.repeat(40_000) })).status()).toBe(413);
  const response = await request.get('/api/comments/?page_slug=x');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});

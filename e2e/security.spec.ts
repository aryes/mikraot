import { expect, test, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { LOCAL_ONLY } from './tags';

/** Collects Content-Security-Policy violations reported in the console. */
function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/.test(message.text())) violations.push(message.text());
  });
  return violations;
}

test('answers from the Worker itself carry the same security headers', async ({ request }) => {
  // _headers reaches static files only; src/worker.ts adds them to the rest (read-only requests).
  for (const path of ['/api/comments/?page_slug=x', '/unsubscribe/', '/comments/feed/']) {
    // oxlint-disable-next-line no-await-in-loop -- three requests, one after another
    const headers = (await request.get(path)).headers();
    expect(headers, path).toMatchObject({
      'x-frame-options': 'DENY',
      'x-content-type-options': 'nosniff',
      'strict-transport-security': expect.stringContaining('max-age='),
      'permissions-policy': expect.stringContaining('camera=()'),
      'cross-origin-opener-policy': 'same-origin',
      'content-security-policy': expect.stringContaining("frame-ancestors 'none'"),
    });
  }
});

test('security headers are sent', async ({ page }) => {
  const response = await page.goto('/');
  // One assertion on the whole set, so a failure shows every header (and the status) received.
  expect({ status: response?.status(), ...response?.headers() }).toMatchObject({
    status: 200,
    'content-security-policy': "frame-ancestors 'none'",
    'x-frame-options': 'DENY',
    'x-content-type-options': 'nosniff',
    'strict-transport-security': expect.stringContaining('max-age='),
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': expect.stringContaining('camera=()'),
  });
  await expect(page.locator('meta[http-equiv="content-security-policy"]')).toHaveAttribute(
    'content',
    /script-src 'self' 'wasm-unsafe-eval' https:\/\/challenges\.cloudflare\.com https:\/\/cloud\.umami\.is 'sha256-/,
  );
});

test('hashed build files are cached for a year; pages are not', async ({ page, request }) => {
  const response = await page.goto('/');
  expect(response?.headers()['cache-control'] ?? '').not.toContain('immutable');
  // Any build file the page uses (a stylesheet may be inlined when small; scripts and the
  // banner image are files). The header comes from @astrojs/cloudflare, which writes it into
  // _headers at build time: this guards against an update dropping it.
  const asset = await page.evaluate(
    () =>
      [...document.querySelectorAll('[href^="/_astro/"], [src^="/_astro/"]')]
        .map((element) => element.getAttribute('href') ?? element.getAttribute('src'))
        .find(Boolean) ?? '',
  );
  expect(asset).toMatch(/^\/_astro\//);
  const cached = await request.get(asset);
  expect(cached.ok()).toBe(true);
  expect(cached.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
});

test('search index pieces are cached for a year, recordings for a week', async ({ request }) => {
  // A piece of the built index (content-hashed name), as the search loads it.
  const [piece = ''] = readdirSync('dist/client/pagefind/fragment');
  const fragment = await request.get(`/pagefind/fragment/${piece}`);
  expect(fragment.headers()['cache-control']).toBe('public, max-age=31536000, immutable');
  const mp3 = '/wp-content/uploads/2023/07/ארגב.mp3';
  const recording = await request.get(mp3);
  expect(recording.headers()['cache-control']).toBe('public, max-age=604800');
  // Revalidated after the week: the 304 keeps the week (browsers copy its headers).
  const etag = recording.headers()['etag'] ?? '';
  const unchanged = await request.get(mp3, { headers: { 'If-None-Match': etag } });
  expect(unchanged.status()).toBe(304);
  expect(unchanged.headers()['cache-control']).toBe('public, max-age=604800');
});

test('security.txt is served (RFC 9116)', async ({ request }) => {
  const response = await request.get('/.well-known/security.txt');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('text/plain; charset=utf-8');
  expect(await response.text()).toMatch(/^Contact: mailto:\S+\nExpires: [\d-]+T[\d:]+Z\n/);
});

test('features work under the CSP: comments, collapsibles, audio, embedded video', async ({
  page,
}) => {
  const violations = watchCsp(page);
  await page.goto('/טעמים/נוסח-אשכנז/');
  await page.getByRole('button', { name: 'הפעלת הסרטון' }).first().click();
  await page.locator('iframe[src*="youtube-nocookie.com"]').first().waitFor();
  await page.locator('.collapse-toggle-btn').first().click();
  // Comments load from the API (any site: no reliance on the local fictional comments).
  const loaded = page.waitForResponse((r) => r.url().includes('/api/comments/') && r.ok());
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await loaded;
  await expect(page.getByText('טוען תגובות...')).toHaveCount(0);

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

  await page.getByRole('button', { name: 'תורה' }).click();
  await page.getByRole('button', { name: 'ויקרא' }).click();
  await page.getByRole('link', { name: 'ראשון' }).click();
  await expect(page.locator('dialog iframe[src*="youtube-nocookie.com"]')).toBeVisible();

  expect(violations).toEqual([]);
});

test('the comments API refuses junk: unknown pages, bots, oversized bodies, no human check', async ({
  request,
}) => {
  const post = (data: unknown) => request.post('/api/comments/', { data });
  const comment = { page_slug: 'דגש-קל', author_name: 'בודק', content: 'בדיקה' };
  expect((await post({ ...comment, page_slug: 'no/such/page' })).status()).toBe(400);
  expect((await post({ ...comment, website: 'https://spam.example' })).status()).toBe(400);
  expect((await post({ ...comment, content: 'x'.repeat(40_000) })).status()).toBe(413);
  expect((await post({ ...comment, parent_id: 999_999 })).status()).toBe(400); // no such comment
  expect((await post({ ...comment, author_name: 'מנהל האתר' })).status()).toBe(400); // reserved
  expect((await post(comment)).status()).toBe(403); // no Turnstile token
  const response = await request.get('/api/comments/?page_slug=x');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});

test("other websites can't make their visitors' browsers post reports", async ({ request }) => {
  // Astro's origin check; a JSON post would need a CORS preflight, which the API doesn't allow.
  const response = await request.post('/api/search-misses/', {
    headers: { origin: 'https://other.example', 'content-type': 'text/plain' },
    data: JSON.stringify({ query: 'x' }),
  });
  expect(response.status()).toBe(403);
});

// Local only: the deployed site does report (and this would send it a probe).
test(
  'error tracking (Sentry) sends nothing outside the deployed site',
  LOCAL_ONLY,
  async ({ page }) => {
    const sent: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('sentry.io')) sent.push(request.url());
    });
    await page.goto('/');
    await page.evaluate(() => {
      const filename = `${location.origin}/_astro/probe.js`;
      dispatchEvent(new ErrorEvent('error', { message: 'e2e probe', filename, lineno: 1 }));
    });
    await page.waitForTimeout(3000); // past the idle moment when Sentry would load
    expect(sent).toEqual([]);
  },
);

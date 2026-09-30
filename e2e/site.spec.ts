import { expect, test } from '@playwright/test';

// Comments load lazily (island script on scroll) and then call a Worker endpoint that may start
// cold, which can exceed the default 5s under parallel test load.
const COMMENTS_LOADED = { timeout: 15_000 };

test('front page renders at /', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/^מקראות/);
  await expect(page.locator('h1')).toHaveText('ראשית קריאה בתנ"ך');
});

test('hierarchical Hebrew WordPress URLs are served', async ({ page }) => {
  const response = await page.goto('/טעמים/נוסח-אשכנז/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('טעמים בנוסח אשכנז');
});

test('unknown URLs get a 404 page', async ({ page }) => {
  const response = await page.goto('/no-such-page/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('404');
});

test('collapsible explanations open and close', async ({ page }) => {
  await page.goto('/טעמים/נוסח-אשכנז/');
  const toggle = page.locator('.collapse-toggle-btn').first();
  const panel = page.locator(`#${await toggle.getAttribute('data-target')}`);
  await expect(panel).toBeHidden();
  await toggle.click();
  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(panel).toBeHidden();
});

test('approved comments load when the comments section scrolls into view', async ({ page }) => {
  await page.goto('/טעמים/נוסח-אשכנז/');
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await expect(page.getByText('קורא לדוגמה')).toBeVisible(COMMENTS_LOADED);
  await expect(page.getByText('מנהל האתר')).toBeVisible(); // admin reply badge
  await expect(page.getByRole('heading', { name: 'תגובות ושאלות (2)' })).toBeVisible();
  await expect(page.getByText('ממתין לאישור')).toHaveCount(0); // unapproved stays hidden
});

test('a visitor can post a comment', async ({ page }, testInfo) => {
  const text = `תגובת בדיקה ${testInfo.project.name} ${Date.now()}`;
  await page.goto('/about/');
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await expect(page.getByText('אורח לדוגמה')).toBeVisible(COMMENTS_LOADED);
  await expect(page.getByText('אורח לדוגמה 0')).toHaveCount(0); // no stray '0' from is_admin_reply
  await page.getByPlaceholder('השם שלכם').fill('מבקר בדיקה');
  await page.getByPlaceholder('כתבו את תגובתכם').fill(text);
  await page.getByRole('button', { name: 'פרסום תגובה' }).click();
  await expect(page.getByText('התגובה נוספה בהצלחה!')).toBeVisible(COMMENTS_LOADED);
  await expect(page.getByText(text)).toBeVisible();
  await page.reload();
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await expect(page.getByText(text)).toBeVisible(COMMENTS_LOADED); // persisted in D1
});

test('menu links point to real WordPress URLs', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) await page.getByLabel('תפריט').first().click();
  const menu = page.getByRole('navigation', { name: isMobile ? 'תפריט' : 'ניווט ראשי' });
  // On desktop the page sits in the 'הגיה' dropdown, which opens on hover.
  if (!isMobile) await menu.getByRole('button', { name: 'הגיה' }).hover();
  const link = menu.getByRole('link', { name: 'מבטא', exact: true });
  await expect(link).toHaveAttribute('href', '/מבטא/');
  await link.click();
  await expect(page).toHaveURL(/\/%D7%9E%D7%91%D7%98%D7%90\/$/);
  await expect(page.locator('h1')).toHaveText('מבטא');
});

test('media is served by the site at the WordPress paths', async ({ page, request }) => {
  const mp3 = await request.get('/wp-content/uploads/2023/07/ארגב.mp3');
  expect(mp3.status()).toBe(200);
  expect(mp3.headers()['content-type']).toContain('audio/mpeg');

  await page.goto('/דגש-קל/');
  const sources = await page
    .locator('.inline-audio-btn')
    .evaluateAll((buttons) => buttons.map((b) => b.getAttribute('data-audio-src') ?? ''));
  expect(sources.length).toBeGreaterThan(0);
  const statuses = await Promise.all(
    sources.map(async (src) => (await request.head(src)).status()),
  );
  sources.forEach((src, i) => {
    expect(src).toMatch(/^\/wp-content\/uploads\//);
    expect(statuses[i], src).toBe(200);
  });
});

test('pages keep the live site titles, descriptions and social tags', async ({ page }) => {
  await page.goto('/שווא-נע/');
  await expect(page).toHaveTitle('שווא נע - מקראות');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S{10}/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://mikraot.net/%D7%A9%D7%95%D7%95%D7%90-%D7%A0%D7%A2/',
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'שווא נע - מקראות',
  );
});

test('sitemap lists every page; the WordPress sitemap URL redirects to it', async ({ request }) => {
  const index = await request.get('/sitemap-index.xml');
  expect(index.status()).toBe(200);
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  expect(sitemap.match(/<loc>/g)).toHaveLength(34);

  const old = await request.get('/sitemap.xml', { maxRedirects: 0 });
  expect(old.status()).toBe(301);
  expect(old.headers()['location']).toMatch(/\/sitemap-index\.xml$/);

  expect(await (await request.get('/robots.txt')).text()).toContain(
    'Sitemap: https://mikraot.net/sitemap-index.xml',
  );
});

test('WordPress formatting classes render: centred text and class-only orange', async ({
  page,
}) => {
  await page.goto('/דגש-קל/');
  const centred = page.locator('.wp-content-rendered .has-text-align-center').first();
  await expect(centred).toHaveCSS('text-align', 'center');

  await page.goto('/שווא-נע/');
  const orange = page.locator('.wp-content-rendered .has-luminous-vivid-orange-color').first();
  await expect(orange).toHaveCSS('color', 'rgb(255, 105, 0)');
});

test('fonts are self-hosted and load (no third-party font requests)', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (req) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(req.url())) external.push(req.url());
  });
  await page.goto('/שווא-נע/');
  await page.evaluate(() => document.fonts.ready);
  const loaded = await page.evaluate(() => ({
    body: document.fonts.check('16px "Assistant Variable"', 'שווא'),
    heading: document.fonts.check('16px "Frank Ruhl Libre Variable"', 'שווא'),
  }));
  expect(loaded).toEqual({ body: true, heading: true });
  expect(external).toEqual([]);
});

test('search finds pages by keyword (Ctrl+K), ignoring niqqud', async ({ page }) => {
  await page.goto('/about/');
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'חיפוש באתר' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('searchbox').fill('בראשית');
  // Match by URL: niqqud marks can be stored in different orders, so text patterns are fragile.
  await expect(dialog.locator('a[href="/בראשית/"]')).toBeVisible();

  await dialog.getByRole('searchbox').fill('דגש קל');
  const first = dialog.getByRole('listitem').first().getByRole('link');
  await expect(first).toContainText('דגש קל');
  await first.click();
  await expect(page.locator('h1')).toHaveText('דגש קל');
});

test('search opens from the header button and reports no results', async ({ page }) => {
  // Stub the index: real Pagefind still returns weak single-letter matches for most queries.
  await page.route('**/pagefind/pagefind.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'export const search = async () => ({ results: [] });',
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'חיפוש באתר' }).click();
  const dialog = page.getByRole('dialog', { name: 'חיפוש באתר' });
  await dialog.getByRole('searchbox').fill('מילה');
  await expect(dialog.getByText('לא נמצאו תוצאות עבור "מילה"')).toBeVisible();
});

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

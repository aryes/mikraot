import { expect, test } from '@playwright/test';

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

test('existing comments load when the comments section scrolls into view', async ({ page }) => {
  await page.goto('/טעמים/נוסח-אשכנז/');
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  // Comments come from the live API until it moves into this Worker, so allow for the network.
  await expect(page.getByText('מיכל').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'תגובות ושאלות (2)' })).toBeVisible();
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

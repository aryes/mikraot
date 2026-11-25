import { expect, test, type Page } from '@playwright/test';

/**
 * Shows the choices: on phones in the menu (which stays open), on wider screens the header's
 * toggle, opened by the pointer over it.
 */
async function showSwitch(page: Page): Promise<void> {
  const menu = page.locator('summary[aria-label="תפריט"]');
  if (await menu.isVisible()) {
    // An open <details> has an empty `open`: null only when closed.
    const open = await page
      .locator('details:has(> summary[aria-label="תפריט"])')
      .getAttribute('open');
    if (open === null) await menu.click();
    return;
  }
  // From elsewhere: after a choice, hover opens it again only once the pointer has left.
  await page.mouse.move(640, 600);
  await page.getByRole('group', { name: 'תצוגה' }).hover();
}

/** A choice of the visible switch (in the header or the menu: the other is hidden). */
const choice = (page: Page, name: string) =>
  page.getByRole('group', { name: 'תצוגה' }).getByRole('radio', { name, exact: true });

/** Chooses it as a reader does, on its label (the radio itself is drawn by its label). */
async function choose(page: Page, name: string): Promise<void> {
  await showSwitch(page);
  await page
    .getByRole('group', { name: 'תצוגה' })
    .locator('label')
    .filter({ has: page.getByRole('radio', { name, exact: true }) })
    .click();
}

test('the light/dark switch: by the device, light or dark, remembered, with the dark photo', async ({
  page,
}) => {
  const blocked: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy|Refused to/.test(message.text())) blocked.push(message.text());
  });
  // The front page's photo: which versions the browser asked for (one only, the one shown).
  const photos: string[] = [];
  page.on('request', (request) => {
    const name = /banner-cottonbro(-dark)?\./.exec(request.url());
    if (name) photos.push(name[1] ? 'dark' : 'light');
  });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const html = page.locator('html');
  const photo = page.locator('picture img').first();

  // By the device (dark here), before any choice.
  await showSwitch(page);
  await expect(choice(page, 'לפי המכשיר')).toBeChecked();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(photo).toHaveJSProperty('complete', true);
  expect(await photo.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain('dark');
  expect(photos).toEqual(['dark']);

  await choose(page, 'בהירה');
  await expect(html).not.toHaveAttribute('data-theme');
  await expect
    .poll(() => photo.evaluate((img: HTMLImageElement) => img.currentSrc))
    .not.toContain('dark');

  await choose(page, 'כהה');
  // The other switch (the menu's on desktop, the header's on phones) shows the same choice.
  await Promise.all(
    ['theme', 'theme-menu'].map((group) =>
      expect(page.locator(`input[name="${group}"][value="dark"]`)).toHaveJSProperty(
        'checked',
        true,
      ),
    ),
  );
  await expect(html).toHaveAttribute('data-theme', 'dark');
  // A choice holds whatever the device says.
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(html).toHaveAttribute('data-theme', 'dark');

  // Remembered, and applied before the page draws, though the device is now light: the photo's
  // dark version is the one loaded, by the inline scripts the CSP allows.
  photos.length = 0;
  await page.reload();
  await showSwitch(page);
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(choice(page, 'כהה')).toBeChecked();
  await expect(photo).toHaveJSProperty('complete', true);
  expect(await photo.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain('dark');
  expect(photos).toEqual(['dark']);

  // Radio buttons: an arrow key moves the choice, away from dark here.
  await showSwitch(page);
  await choice(page, 'כהה').focus();
  await page.keyboard.press('ArrowLeft');
  await expect(html).not.toHaveAttribute('data-theme');

  // Back to the device's setting, now light.
  await choose(page, 'לפי המכשיר');
  await expect(html).not.toHaveAttribute('data-theme');
  // The 404 page gets its CSP as a header that covers the whole page.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/no-such-page/');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  expect(blocked).toEqual([]);
});

test.describe("the header's light/dark toggle", () => {
  test.skip(({ isMobile }) => isMobile, 'on phones the choices are in the menu');

  test('the choice alone; the others shown on hover, and folded after a choice', async ({
    page,
  }) => {
    await page.goto('/');
    const toggle = page.getByRole('group', { name: 'תצוגה' });
    const label = (name: string) =>
      toggle.locator('label').filter({ has: page.getByRole('radio', { name, exact: true }) });
    await page.mouse.move(640, 600);
    await expect(label('לפי המכשיר')).toBeVisible();
    await expect(label('כהה')).toBeHidden();
    await toggle.hover();
    await expect(label('כהה')).toBeVisible();
    // A choice folds it at once, though the pointer is still over it: the new choice alone.
    await label('כהה').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(label('לפי המכשיר')).toBeHidden();
    await expect(label('כהה')).toBeVisible();
    // The keyboard's focus shows the others: Tab from the control before it.
    await page.mouse.move(640, 600);
    await page.getByRole('combobox', { name: 'נוסח' }).focus();
    await page.keyboard.press('Tab');
    await expect(label('בהירה')).toBeVisible();
  });

  test.describe('on a touch screen', () => {
    test.use({ hasTouch: true });

    test('a tap on the choice shows the others, a tap elsewhere hides them', async ({ page }) => {
      await page.goto('/');
      const toggle = page.getByRole('group', { name: 'תצוגה' });
      const label = (name: string) =>
        toggle.locator('label').filter({ has: page.getByRole('radio', { name, exact: true }) });
      await label('לפי המכשיר').tap();
      await expect(toggle).toHaveAttribute('data-open', '');
      await expect(label('כהה')).toBeVisible();
      await page.locator('main').tap({ position: { x: 20, y: 300 } });
      await expect(toggle).not.toHaveAttribute('data-open');
      await label('לפי המכשיר').tap();
      await label('כהה').tap();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await expect(toggle).not.toHaveAttribute('data-open');
    });
  });
});

import { expect, test, type Page } from '@playwright/test';

/**
 * Shows the choices: on phones in the menu (which stays open), on wider screens the header's
 * button showing the current one, whose choices close again after each.
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
  const button = page.getByRole('button', { name: /^תצוגה/ });
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
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

  // By the device (dark here), before any choice; on wider screens the header's button names it.
  if (!test.info().project.name.includes('mobile')) {
    await expect(page.getByRole('button', { name: /^תצוגה/ })).toHaveAccessibleName(
      'תצוגה: לפי המכשיר',
    );
  }
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

test("the header's light/dark choices: open on a click, closed by Escape, a click elsewhere or a choice", async ({
  page,
}) => {
  test.skip(test.info().project.name.includes('mobile'), 'on phones the choices are in the menu');
  await page.goto('/');
  const button = page.getByRole('button', { name: /^תצוגה/ });
  const dark = page.getByRole('radio', { name: 'כהה', exact: true });
  // Away from the button, so hover doesn't hold the choices open.
  const away = async () => page.mouse.move(640, 600);

  await button.click();
  await away();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(dark).toBeVisible();
  // An arrow key chooses and leaves them open; Escape closes them and returns to the button.
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowLeft');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(dark).toBeHidden();
  await expect(button).toBeFocused();

  // A click elsewhere closes them.
  await button.click();
  await away();
  await page.mouse.click(640, 600);
  await expect(dark).toBeHidden();

  // A choice made by a click closes them.
  await button.click();
  await page.locator('label').filter({ has: dark }).click();
  await away();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(dark).toBeHidden();
});

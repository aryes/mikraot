import { expect, test, type Page } from '@playwright/test';

/** On phones the switch is in the menu: opened first. */
async function showSwitch(page: Page): Promise<void> {
  const menu = page.locator('summary[aria-label="תפריט"]');
  if (await menu.isVisible()) await menu.click();
}

/** A choice of the visible switch (in the header or the menu: the other is hidden). */
const choice = (page: Page, name: string) =>
  page.getByRole('group', { name: 'תצוגה' }).getByRole('radio', { name, exact: true });

/** Chooses it as a reader does, on its label (the radio itself is drawn by its label). */
const choose = (page: Page, name: string) =>
  page
    .getByRole('group', { name: 'תצוגה' })
    .locator('label')
    .filter({ has: page.getByRole('radio', { name, exact: true }) })
    .click();

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
  await showSwitch(page);
  const html = page.locator('html');
  const photo = page.locator('picture img').first();

  // By the device (dark here), before any choice.
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

  // Back to the device's setting, now light.
  await choose(page, 'לפי המכשיר');
  await expect(html).not.toHaveAttribute('data-theme');
  // The 404 page gets its CSP as a header that covers the whole page.
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/no-such-page/');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  expect(blocked).toEqual([]);
});

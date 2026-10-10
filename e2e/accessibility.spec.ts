import { AxeBuilder } from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/** Every page of the build (from its sitemap), plus the 404 page. */
const paths = [
  ...[
    ...readFileSync('dist/client/sitemap-0.xml', 'utf8').matchAll(
      /<loc>https:\/\/mikraot\.net([^<]*)<\/loc>/g,
    ),
  ].map((m) => decodeURI(m[1] ?? '/')),
  '/no-such-page/',
];

for (const path of paths) {
  test(`no accessibility violations (WCAG 2.2 AA): ${path}`, async ({ page, isMobile }) => {
    await page.goto(path);
    // Reflow: on a phone the page itself never scrolls sideways (wide tables scroll on their own).
    if (isMobile) {
      const scrollsSideways = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      expect(scrollsSideways).toBe(false);
    }
    const results = await new AxeBuilder({ page })
      // Third-party frames (the YouTube player) are outside our control.
      .exclude('iframe')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.length}× e.g. ${v.nodes[0]?.target.join(' ')}`,
    );
    expect(summary).toEqual([]);
  });
}

const scan = (page: Page) =>
  new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .exclude('iframe')
    .analyze()
    .then((r) => r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`));

test('no accessibility violations with comments loaded', async ({ page }) => {
  await page.goto('/טעמים/נוסח-אשכנז/');
  const loaded = page.waitForResponse((r) => r.url().includes('/api/comments/') && r.ok());
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await loaded;
  await expect(page.getByText('טוען תגובות...')).toHaveCount(0);
  expect(await scan(page)).toEqual([]);
});

test('no accessibility violations with the search dialog open', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await page.getByRole('searchbox').fill('שווא');
  await page.getByRole('dialog').getByRole('link').first().waitFor();
  expect(await scan(page)).toEqual([]);
});

test('no accessibility violations with the mobile menu open', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile menu only');
  await page.goto('/');
  await page.getByLabel('תפריט').first().click();
  expect(await scan(page)).toEqual([]);
});

test('the first Tab offers a skip to the content; sound buttons say what they play', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'keyboard navigation');
  await page.goto(encodeURI('/דגש-קל/'));
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'דלג לתוכן' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  // Not hidden under the sticky header: the link itself is what's drawn at its centre.
  expect(
    await skip.evaluate((link) => {
      const box = link.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return hit?.closest('a') === link;
    }),
  ).toBe(true);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.locator('main :focus')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'השמע: ב דגושה' })).toBeVisible();
});

// Dark mode (the system setting): the same scan on every page, desktop only (the colours are the
// same on a phone), plus loaded comments and the search dialog, whose colours come from scripts.
test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });
  test.skip(({ isMobile }) => isMobile, 'same colours as desktop');

  for (const path of paths) {
    test(`no accessibility violations in dark mode: ${path}`, async ({ page }) => {
      await page.goto(path);
      expect(await scan(page)).toEqual([]);
    });
  }

  test('no accessibility violations in dark mode: comments, an opened explanation, search', async ({
    page,
  }) => {
    await page.goto('/טעמים/נוסח-אשכנז/');
    // An opened explanation (its content and its button are hidden until then).
    await page.locator('.collapse-toggle-btn').first().click();
    const loaded = page.waitForResponse((r) => r.url().includes('/api/comments/') && r.ok());
    await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
    await loaded;
    await expect(page.getByText('טוען תגובות...')).toHaveCount(0);
    expect(await scan(page)).toEqual([]);
    await page.keyboard.press('Control+k');
    await page.getByRole('searchbox').fill('שווא');
    await page.getByRole('dialog').getByRole('link').first().waitFor();
    expect(await scan(page)).toEqual([]);
  });
});

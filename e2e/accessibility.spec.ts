import { AxeBuilder } from '@axe-core/playwright';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/** Every page of the build (from its sitemap), plus the 404 page. */
// The lessons' meaningful colours (orange taught letter, grey context, faint silent letters) are
// below WCAG contrast on purpose; whether to darken them is pending a decision (docs/ROADMAP.md),
// so the scans exclude .mark-highlight/.mark-muted/.mark-silent.
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
      .exclude('.mark-highlight')
      .exclude('.mark-muted')
      .exclude('.mark-silent')
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
    .exclude('.mark-highlight')
    .exclude('.mark-muted')
    .exclude('.mark-silent')
    .analyze()
    .then((r) => r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(' ')}`));

test('no accessibility violations with comments loaded', async ({ page }) => {
  await page.goto('/טעמים/נוסח-אשכנז/');
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await page.getByText('קורא לדוגמה').waitFor({ timeout: 15_000 });
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

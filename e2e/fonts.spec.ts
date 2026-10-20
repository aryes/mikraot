import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * No page shows a character in a system font: every character of its text is one the site's fonts
 * draw (Taamey David, and the trimmed symbol and Arabic fonts). The list comes from
 * scripts/fonts/subsets.py; a character added to the content that none of them has fails here,
 * and the fix is to add it to a trimmed font there.
 */
const coverage: unknown = JSON.parse(readFileSync('e2e/fixtures/font-coverage.json', 'utf8'));
/** The code points of a CSS unicode-range list from the coverage file. */
function points(key: string): Set<number> {
  const ranges = coverage && typeof coverage === 'object' ? Reflect.get(coverage, key) : '';
  const set = new Set<number>();
  for (const part of String(ranges).split(',')) {
    const [first = '', last] = part.replace('U+', '').split('-');
    for (let point = parseInt(first, 16); point <= parseInt(last ?? first, 16); point++) {
      set.add(point);
    }
  }
  return set;
}
const covered = points('ranges');
const logo = points('logo');

const paths = [
  ...readFileSync('dist/client/sitemap-0.xml', 'utf8').matchAll(
    /<loc>https:\/\/mikraot\.net([^<]*)<\/loc>/g,
  ),
].map((m) => decodeURI(m[1] ?? '/'));

test('every character on every page is in one of the site fonts', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the same text on both');
  test.setTimeout(paths.length * 5_000);
  const missing: string[] = [];
  for (const path of paths) {
    // oxlint-disable-next-line no-await-in-loop -- one page at a time
    await page.goto(path);
    // oxlint-disable-next-line no-await-in-loop
    const text = await page.evaluate(() => {
      // The logo has its own font, and keyboard keys are drawn in the system's monospace.
      for (const own of document.querySelectorAll('.font-logo, kbd')) own.remove();
      return document.body.innerText;
    });
    const strays = [...new Set(text)].filter(
      (char) => !/\s/.test(char) && !covered.has(char.codePointAt(0) ?? 0),
    );
    if (strays.length > 0) missing.push(`${path}: ${strays.join(' ')}`);
  }
  expect(missing).toEqual([]);
});

test("the logo's letters are all in its trimmed font", async ({ page, isMobile }) => {
  test.skip(isMobile, 'the same logo on both');
  await page.goto('/');
  // The pointed name drawn (aria-hidden) and the plain one read out, header and footer.
  const text = await page.locator('.font-logo').allInnerTexts();
  const strays = [...new Set(text.join(''))].filter(
    (char) => !/\s/.test(char) && !logo.has(char.codePointAt(0) ?? 0),
  );
  // If this fails, the site's name changed: run scripts/fonts/subsets.py.
  expect(strays).toEqual([]);
});

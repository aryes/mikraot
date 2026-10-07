import { expect, test, type Page } from '@playwright/test';
import { VISUAL } from './tags';

/**
 * Screenshot comparisons of one page of each kind: an unintended change to the layout, fonts or
 * colours fails here. On the phone the whole page is compared; on desktop the first screen
 * (header, banner, layout), which keeps the reference images, committed to the public repository,
 * small. After an intended change, update them with
 * `npx playwright test e2e/visual.spec.ts --update-snapshots` and look at them before committing.
 */
const PAGES = {
  home: '/',
  lesson: '/דגש-קל/',
  post: '/בראשית/',
  videos: '/טעמים/נוסח-אשכנז/',
  about: '/about/',
};

/** Waits until the fonts and every image (lazy ones included) have loaded or failed. */
async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    window.scrollTo(0, document.body.scrollHeight);
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map(async (img) => {
        img.loading = 'eager';
        if (img.complete) return;
        await new Promise((done) => {
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      }),
    );
    window.scrollTo(0, 0);
  });
}

for (const [name, path] of Object.entries(PAGES)) {
  test(`looks as before: ${name}`, VISUAL, async ({ page, isMobile }) => {
    await page.goto(path);
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: isMobile,
      animations: 'disabled',
      // A handful of pixels: a colour change to a few marked letters must still fail.
      maxDiffPixels: 100,
      // Not this site's doing: comments (other tests add some) and video pictures (YouTube's).
      mask: [
        page.locator('[data-pagefind-ignore]'),
        page.locator('div:has(> .video-play-btn) img'),
      ],
    });
  });
}

import { argosScreenshot } from '@argos-ci/playwright';
import { test } from '@playwright/test';
import { VISUAL } from './tags';

/**
 * Screenshots of one page of each kind, whole pages on desktop and phone. In CI they go to Argos
 * (argos-ci.com, project mikraot), which compares them with those of main and shows the
 * differences on the pull request (a check that informs, not one that blocks merging); the design
 * review (docs/DESIGN-REVIEW.md) looks at them. Argos keeps main's as the reference, so the
 * repository holds no images. Argos waits for fonts and images itself.
 */
const PAGES = {
  home: '/',
  lesson: '/דגש-קל/',
  post: '/בראשית/',
  videos: '/טעמים/נוסח-אשכנז/',
  about: '/about/',
};

/** Hidden in the screenshots: not this site's doing (comments, YouTube's video pictures). */
const HIDDEN = '[data-pagefind-ignore], div:has(> .video-play-btn) img { visibility: hidden; }';

for (const [name, path] of Object.entries(PAGES)) {
  test(`screenshot: ${name}`, VISUAL, async ({ page }, testInfo) => {
    // No comments: tests running alongside post some, which would change the page's length.
    await page.route('**/api/comments/**', (route) => route.fulfill({ json: [] }));
    await page.goto(path);
    await argosScreenshot(page, `${name}-${testInfo.project.name}`, { argosCSS: HIDDEN });
  });
}

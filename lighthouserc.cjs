/**
 * Lighthouse CI (`npm run lighthouse`, after a build; also in CI): Google's speed, accessibility,
 * best-practice and SEO scores for a few page types of the built site, with minimum scores so a
 * change that makes them worse fails. The build is served in workerd as in production (comments
 * API, _headers, _redirects), on its own port; Playwright's Chromium does the measuring.
 */
const { chromium } = require('@playwright/test');

const port = 4324;
// One page of each kind: the home page, a lesson, a post, and a page with embedded videos.
const pages = ['/', '/דגש-קל/', '/בראשית/', '/טעמים/נוסח-אשכנז/'];
// Single Lighthouse runs vary by several points: each limit applies to the median of three.
const atLeast = (minScore) => ['error', { minScore, aggregationMethod: 'median' }];

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npx astro preview --port ${port}`,
      startServerReadyPattern: `localhost:${port}`,
      url: pages.map((page) => `http://localhost:${port}${encodeURI(page)}`),
      numberOfRuns: 3,
      chromePath: chromium.executablePath(),
      settings: { chromeFlags: '--headless=new --no-sandbox' },
    },
    // Somewhat below the medians measured 2026-10-07 in workerd (performance: home 92, lesson 92,
    // post 82, video page 61; accessibility 98-100; best practices 96-100; SEO 100), so run-to-run
    // noise on shared CI machines passes and a real step back fails.
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: '.*',
          assertions: {
            'categories:accessibility': atLeast(0.95),
            'categories:best-practices': atLeast(0.9),
            'categories:seo': atLeast(0.95),
          },
        },
        {
          // Embedded YouTube players weigh about 1 MB of scripts (docs/RECOMMENDATIONS.md).
          matchingUrlPattern: '^(?!.*%D7%A0%D7%95%D7%A1%D7%97-%D7%90%D7%A9%D7%9B%D7%A0%D7%96).*$',
          assertions: { 'categories:performance': atLeast(0.75) },
        },
      ],
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};

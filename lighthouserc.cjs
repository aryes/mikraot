/**
 * Lighthouse CI (`npm run lighthouse`, after a build; also in CI): Google's speed, accessibility,
 * best-practice and SEO scores for a few page types of the built site, with minimum scores so a
 * change that makes them worse fails. The build is served in workerd as in production (comments
 * API, _headers, _redirects), on its own port; Playwright's Chromium does the measuring.
 */
const { chromium } = require('@playwright/test');

const port = 4384; // away from the dev server (4321 and up), like the browser tests (4380)
// One page of each kind: the home page, a lesson, a post, and a page with embedded videos.
const allPages = ['/', '/דגש-קל/', '/בראשית/', '/טעמים/נוסח-אשכנז/'];
// CI splits the pages over parallel jobs (LH_SHARD=1/2, 2/2): same pages, runs and limits, about
// half the time. Unset (locally), all pages.
const [shard, shards] = (process.env['LH_SHARD'] ?? '1/1').split('/').map(Number);
const pages = allPages.filter((_, i) => i % shards === shard - 1);
if (pages.length === 0) throw new Error(`LH_SHARD=${process.env['LH_SHARD']} selects no pages`);
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
    // Somewhat below the medians measured 2026-10-07 in workerd (performance: home 95, lesson 92,
    // post 82, video page 93; accessibility 98-100; best practices and SEO 100), so run-to-run
    // noise on shared CI machines passes and a real step back fails.
    assert: {
      assertions: {
        'categories:performance': atLeast(0.75),
        'categories:accessibility': atLeast(0.95),
        'categories:best-practices': atLeast(0.9),
        'categories:seo': atLeast(0.95),
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};

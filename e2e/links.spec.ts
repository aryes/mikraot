import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { LinkChecker, LinkState } from 'linkinator';

// Replaces WordPress's Broken Link Checker for links inside the site: every page, image, file and
// #anchor must resolve. Outside links are checked weekly (scripts/check-external-links.ts).
// One browser project is enough: this is about the server, not the device.
test.beforeEach(({ browserName, isMobile }) => {
  test.skip(browserName !== 'chromium' || isMobile, 'runs once, on desktop');
});

test('every internal link, image and #anchor works', async ({ baseURL }) => {
  test.setTimeout(180_000);
  const origin = new URL(baseURL ?? '').origin;
  const result = await new LinkChecker().check({
    path: `${origin}/`,
    recurse: true,
    checkFragments: true,
    linksToSkip: async (link) => !link.startsWith(origin),
  });
  const broken = result.links
    .filter((link) => link.state === LinkState.BROKEN)
    .map((link) => `${link.status} ${decodeURI(link.url)} (on ${decodeURI(link.parent ?? '?')})`);
  expect(broken).toEqual([]);
  expect(result.links.length).toBeGreaterThan(50); // the crawl really ran
});

test('every recording the pages play exists', async ({ request }) => {
  // Audio buttons keep their file in a data attribute, which a link checker doesn't follow.
  const sitemap = readFileSync('dist/client/sitemap-0.xml', 'utf8');
  const pages = [...sitemap.matchAll(/<loc>https:\/\/mikraot\.net([^<]*)<\/loc>/g)].map(
    (m) => m[1],
  );
  const bodies = await Promise.all(
    pages.map(async (path) => (await request.get(path ?? '/')).text()),
  );
  const files = new Set(
    bodies.flatMap((body) =>
      [...body.matchAll(/data-audio-src="([^"]+\.mp3)"/g)].map((m) => m[1] ?? ''),
    ),
  );
  expect(files.size).toBeGreaterThan(20);
  const missing = (
    await Promise.all(
      [...files].map(async (file) => ((await request.head(file)).ok() ? null : decodeURI(file))),
    )
  ).filter(Boolean);
  expect(missing).toEqual([]);
});

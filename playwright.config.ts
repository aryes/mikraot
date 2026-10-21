import { createArgosReporterOptions } from '@argos-ci/playwright/reporter';
import { defineConfig, devices } from '@playwright/test';

// Well above 4321: each time the dev server restarts (a config change) it takes the next free port
// without releasing its old one, and the tests would reuse whatever answers here.
const port = 4380;
/** A deployed site to check instead of the local build (`npm run test:deployed -- <url>`). */
const deployed = process.env['E2E_BASE_URL'];
const ci = Boolean(process.env['CI']);
// Against a deployed site only the read-only tests run. The screenshots run in CI only, where
// Argos compares them (e2e/visual.spec.ts); locally there is nothing to compare them with. Set on
// each project, where a --grep-invert on the command line can't replace it.
const skipped = deployed ? /@local/ : ci ? undefined : /@visual/;
const readOnly = skipped ? { grepInvert: skipped } : {};

export default defineConfig({
  testDir: 'e2e',
  // Two workers locally: about a third faster than one. GitHub's Linux machines have four cores,
  // so CI runs four. The tests that write data are few and touch separate pages; the cold-start
  // stall is avoided by warming the server up first.
  workers: process.env['CI'] ? 4 : 2,
  // Tests spread individually, not file by file: CI's three shards (--shard) then get about a
  // third each (by file they got 127, 99 and 60). The tests don't depend on their order in a file
  // (checked 2026-10-13: the whole suite passes this way).
  fullyParallel: true,
  globalSetup: './e2e/warm-up.ts',
  forbidOnly: Boolean(process.env['CI']),
  // One retry (in every run, CI and deployed ones too) absorbs a rare page load that aborts after
  // 30 s, in a different test each time: Cloudflare's local runtime resetting connections under
  // load on Windows (found 2026-10-15, see webServer below; not seen in CI on Linux). Retried tests
  // are still reported as flaky.
  retries: 1,
  // In CI (pull requests and main, not the deployed-site runs) the screenshots go to Argos, which
  // compares them with main's and reports the differences on the pull request.
  reporter: [
    [ci ? 'dot' : 'list'],
    [
      '@argos-ci/playwright/reporter',
      createArgosReporterOptions({
        uploadToArgos: ci && !deployed,
        // Informational: Argos being down, out of quota or refusing a fork must not fail the tests.
        ignoreUploadFailures: true,
      }),
    ],
  ],
  use: {
    baseURL: deployed ?? `http://127.0.0.1:${port}`, // where wrangler dev listens (not ::1)
    // On the live site the tests must not count as visitors: Umami's own opt-out, a localStorage
    // flag its script checks before sending anything.
    ...(deployed && {
      storageState: {
        cookies: [],
        origins: [
          {
            origin: new URL(deployed).origin,
            localStorage: [{ name: 'umami.disabled', value: '1' }],
          },
        ],
      },
    }),
    trace: 'retain-on-failure',
    // The same text rendering on every machine (Argos's advice for stable screenshots).
    launchOptions: { args: ['--disable-lcd-text', '--font-render-hinting=none'] },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, ...readOnly },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, ...readOnly },
  ],
  // Tests run against the production build in Cloudflare's workerd runtime, with the local D1
  // database reset to e2e/fixtures/comments.sql (fictional data). Served by `wrangler dev` with the
  // built Worker's config rather than `astro preview`: the latter adds Vite's proxy in front of
  // workerd, whose loopback connections reset under the suite's load on Windows (requests left
  // pending, page loads never finishing; 3–11 stalled tests per local run, 2026-10-15). Directly
  // on workerd: 0–3 per run, and the suite is faster. --persist-to: the D1 that
  // db:local:reset fills (by default wrangler would keep its data beside dist/server/).
  webServer: deployed
    ? []
    : {
        command: `npm run db:local:reset && npm run build:site && npx wrangler dev --config dist/server/wrangler.json --port ${port} --persist-to .wrangler/state`,
        url: `http://127.0.0.1:${port}/`,
        reuseExistingServer: !process.env['CI'],
        timeout: 180_000,
        // Cloudflare's always-pass Turnstile test key (.dev.vars has the matching test secret).
        env: { PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' },
      },
});

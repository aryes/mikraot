import { defineConfig, devices } from '@playwright/test';

// Well above 4321: each time the dev server restarts (a config change) it takes the next free port
// without releasing its old one, and the tests would reuse whatever answers here.
const port = 4380;
/** A deployed site to check instead of the local build (`npm run test:deployed -- <url>`). */
const deployed = process.env['E2E_BASE_URL'];
// Against a deployed site only the read-only tests run, and CI (Linux) skips the screenshot
// comparisons made on Windows (see e2e/tags.ts). Set on each project, where a --grep-invert on the
// command line can't replace it.
const skipped = deployed ? /@local/ : process.env['CI'] ? /@visual/ : undefined;
const readOnly = skipped ? { grepInvert: skipped } : {};

export default defineConfig({
  testDir: 'e2e',
  // Two workers: about a third faster than one. The tests that write data are few and touch
  // separate pages; the cold-start stall is avoided by warming the server up first.
  workers: 2,
  globalSetup: './e2e/warm-up.ts',
  forbidOnly: Boolean(process.env['CI']),
  // One retry (in every run, CI and deployed ones too) absorbs a rare page load that aborts after
  // 30 s, in a different test each time: likely a stall of the local server on Windows
  // (investigated 2026-10-07; not seen in CI on Linux). Retried tests are still reported as flaky.
  retries: 1,
  use: {
    baseURL: deployed ?? `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, ...readOnly },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, ...readOnly },
  ],
  // Tests run against the production build in Cloudflare's workerd runtime, with the local D1
  // database reset to e2e/fixtures/comments.sql (fictional data).
  webServer: deployed
    ? []
    : {
        command: `npm run db:local:reset && npm run build:site && npx astro preview --port ${port}`,
        url: `http://localhost:${port}/`,
        reuseExistingServer: !process.env['CI'],
        timeout: 180_000,
        // Cloudflare's always-pass Turnstile test key (.dev.vars has the matching test secret).
        env: { PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' },
      },
});

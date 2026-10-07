import { defineConfig, devices } from '@playwright/test';

const port = 4322;
/** A deployed site to check instead of the local build (`npm run test:deployed -- <url>`). */
const deployed = process.env['E2E_BASE_URL'];
// Against a deployed site only the read-only tests run (see e2e/tags.ts). Set on each project,
// where a --grep-invert on the command line can't replace it.
const readOnly = deployed ? { grepInvert: /@local/ } : {};

export default defineConfig({
  testDir: 'e2e',
  // One worker: the local D1 emulation can stall when a write overlaps other requests
  // (seen as comments hanging on "loading"); serial runs are stable and barely slower.
  workers: 1,
  forbidOnly: Boolean(process.env['CI']),
  // One retry absorbs a rare stall of the local server on Windows (a page load aborted after 30 s,
  // in a different test each time; investigated 2026-10-07, never seen in CI on Linux). Retried
  // tests are still reported as flaky.
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

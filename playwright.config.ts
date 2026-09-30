import { defineConfig, devices } from '@playwright/test';

const port = 4322;

export default defineConfig({
  testDir: 'e2e',
  // One worker: the local D1 emulation can stall when a write overlaps other requests
  // (seen as comments hanging on "loading"); serial runs are stable and barely slower.
  workers: 1,
  forbidOnly: Boolean(process.env['CI']),
  // One retry absorbs rare local browser aborts; retried tests are still reported as flaky.
  retries: 1,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  // Tests run against the production build in Cloudflare's workerd runtime, with the local D1
  // database reset to e2e/fixtures/comments.sql (fictional data).
  webServer: {
    command: `npm run db:local:reset && npx astro build && npx astro preview --port ${port}`,
    url: `http://localhost:${port}/`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});

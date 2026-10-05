/**
 * Runs the read-only end-to-end tests against a deployed site, e.g. after a deploy:
 *   npm run test:deployed -- https://mikraot.mikraot-app.workers.dev [Playwright options]
 * Tests that write data are skipped (e2e/tags.ts). The accessibility tests take their page list
 * from the local build's sitemap, so build the same commit first (`npm run build:site`).
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const [url, ...playwrightArgs] = process.argv.slice(2);
if (!url || !/^https?:\/\//.test(url)) {
  console.error('Usage: npm run test:deployed -- <site URL> [Playwright options]');
  process.exit(2);
}
if (playwrightArgs.some((arg) => arg.startsWith('--grep'))) {
  // The read-only filter must not be widened by accident; use --project or test files instead.
  console.error('--grep options are not allowed here: they could select tests that write data.');
  process.exit(2);
}
if (!existsSync('dist/client/sitemap-0.xml')) {
  console.error('Build first (npm run build:site): the accessibility tests list pages from it.');
  process.exit(2);
}
// Playwright's own CLI, run by Node directly: no shell, so arguments arrive intact.
const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
const result = spawnSync(process.execPath, [cli, 'test', ...playwrightArgs], {
  stdio: 'inherit',
  env: { ...process.env, E2E_BASE_URL: new URL(url).origin },
});
if (result.error) console.error(result.error);
process.exit(result.status ?? 1);

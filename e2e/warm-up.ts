import type { FullConfig } from '@playwright/test';

/**
 * Playwright global setup: request a few pages before the tests start. A freshly started local
 * server (Cloudflare's runtime, emulated) is slow on its first requests, and with parallel workers
 * the first test of each could time out while it warms up (seen 2026-10-08).
 */
export default async function warmUp(config: FullConfig): Promise<void> {
  const base = config.projects[0]?.use.baseURL;
  // A deployed site needs no warming up.
  if (!base || process.env['E2E_BASE_URL']) return;
  const paths = ['/', encodeURI('/דגש-קל/'), '/api/comments/?page_slug=about'];
  await Promise.all(
    paths.map(async (path) => {
      try {
        await fetch(new URL(path, base), { signal: AbortSignal.timeout(120_000) });
      } catch {
        // Only a warm-up: a failure here shows up properly in the tests themselves.
      }
    }),
  );
}

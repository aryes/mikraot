/**
 * Worker bindings (see wrangler.jsonc), typed with the minimal interfaces the server code uses.
 * The full `@cloudflare/workers-types` are not loaded because they redefine DOM types that the
 * browser code relies on.
 */
declare module 'cloudflare:workers' {
  // An ambient module can't use a relative `import` statement, so the type is imported inline.
  export const env: {
    // oxlint-disable-next-line typescript/consistent-type-imports
    DB: import('./server/comments').CommentsDb & import('./server/backup').BackupDb;
    /** The static files (dist/client). */
    ASSETS: { fetch(input: string | URL): Promise<Response> };
    /** Turnstile secret key (wrangler secret; locally in .dev.vars). */
    TURNSTILE_SECRET_KEY?: string;
    /** Brevo API key for comment notices (wrangler secret); without it nothing is sent. */
    BREVO_API_KEY?: string;
    /** Per-visitor limit on posting comments (wrangler.jsonc `ratelimits`). */
    COMMENT_RATE_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
    /** At most one owner alert a minute per kind (src/server/alerts.ts). */
    ALERT_RATE_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
    /** Per-visitor limit on browser error reports (src/pages/api/client-errors.ts). */
    CLIENT_ERROR_RATE_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
    /** Searches that found nothing (Analytics Engine dataset; src/server/search-misses.ts). */
    // oxlint-disable-next-line typescript/consistent-type-imports
    SEARCH_MISSES: import('./server/search-misses').SearchMissesDataset;
    /** Per-visitor limit on reports of searches with no results (src/pages/api/search-misses.ts). */
    SEARCH_RATE_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
    /** Daily database backups (Workers KV; src/server/backup.ts). */
    // oxlint-disable-next-line typescript/consistent-type-imports
    BACKUPS: import('./server/backup').BackupStore;
    /** When each kind of failure was last emailed (Workers KV; src/server/alerts.ts). */
    // oxlint-disable-next-line typescript/consistent-type-imports
    ALERTS: import('./server/alerts').AlertStore;
  };
}

declare namespace App {
  interface Locals {
    /** Tables rendered so far on the page (src/components/content/ContentTable.astro). */
    tableCount?: number;
  }
}

interface Window {
  /** Cloudflare Turnstile, once its script has loaded (src/components/Turnstile.tsx). */
  turnstile?: {
    render(
      container: HTMLElement,
      options: {
        sitekey: string;
        callback: (token: string) => void;
        'expired-callback': () => void;
        'error-callback': () => void;
      },
    ): string;
    remove(widgetId: string): void;
  };
  /** Loads Pagefind's search module; defined by public/scripts/pagefind-loader.js. */
  loadPagefind?: () => Promise<unknown>;
}

/**
 * Worker bindings (see wrangler.jsonc), typed with the minimal interfaces the server code uses.
 * The full `@cloudflare/workers-types` are not loaded because they redefine DOM types that the
 * browser code relies on.
 */
declare module 'cloudflare:workers' {
  // An ambient module can't use a relative `import` statement, so the type is imported inline.
  export const env: {
    // oxlint-disable-next-line typescript/consistent-type-imports
    DB: import('./server/comments').CommentsDb;
    /** The static files (dist/client). */
    ASSETS: { fetch(input: string | URL): Promise<Response> };
    /** Per-visitor limit on posting comments (wrangler.jsonc `ratelimits`). */
    /** Turnstile secret key (wrangler secret; locally in .dev.vars). */
    TURNSTILE_SECRET_KEY?: string;
    COMMENT_RATE_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
  };
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

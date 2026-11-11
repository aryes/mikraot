/**
 * Worker bindings (see wrangler.jsonc), typed with the minimal interfaces the server code uses.
 * The full `@cloudflare/workers-types` are not loaded because they redefine DOM types that the
 * browser code relies on.
 */
declare module 'cloudflare:workers' {
  /** A Durable Object class (src/server/quiz-duel.ts): only what the site uses. */
  export abstract class DurableObject {
    protected ctx: DurableObjectState;
    protected env: unknown;
    constructor(ctx: DurableObjectState, env: unknown);
    fetch(request: Request): Promise<Response>;
    webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void>;
    webSocketClose(
      socket: WebSocket,
      code: number,
      reason: string,
      clean: boolean,
    ): void | Promise<void>;
    alarm(): Promise<void>;
  }
  // An ambient module can't use a relative `import` statement, so the type is imported inline.
  export const env: {
    // oxlint-disable-next-line typescript/consistent-type-imports
    DB: import('./server/comments').CommentsDb & import('./server/backup').BackupDb;
    /** The static files (dist/client). */
    ASSETS: { fetch(input: string | URL | Request): Promise<Response> };
    /** Turnstile secret key (wrangler secret; locally in .dev.vars). */
    TURNSTILE_SECRET_KEY?: string;
    /** Brevo API key for comment notices (wrangler secret); without it nothing is sent. */
    BREVO_API_KEY?: string;
    /** Shared with Brevo's newsletter webhook (wrangler secret; src/pages/api/newsletter-webhook.ts). */
    NEWSLETTER_WEBHOOK_SECRET?: string;
    /** Emails Brevo refused, sent again later (wrangler.jsonc `queues`; src/server/email.ts). */
    // oxlint-disable-next-line typescript/consistent-type-imports
    EMAIL_RETRY?: import('./server/email').EmailRetry;
    /** Signs the comment management links (wrangler secret; src/server/comment-manage.ts). */
    COMMENT_MANAGE_SECRET?: string;
    /** Per-visitor limit on newsletter sign-ups (src/pages/api/newsletter.ts). */
    NEWSLETTER_RATE_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
    /** Per-address limit on newsletter sign-ups (the same file). */
    NEWSLETTER_EMAIL_RATE_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
    /** Per-visitor limit on posting comments (wrangler.jsonc `ratelimits`). */
    COMMENT_RATE_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
    /** At most one owner alert a minute per kind (src/server/alerts.ts). */
    ALERT_RATE_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
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
    /** The quiz duels' rooms (Durable Objects; src/server/quiz-duel.ts). */
    QUIZ_DUEL: {
      idFromName(name: string): unknown;
      get(id: unknown): { fetch(request: Request): Promise<Response> };
    };
    /** Per-visitor limit on joining quiz duels (src/worker.ts). */
    DUEL_RATE_LIMIT: { limit(options: { key: string }): Promise<{ success: boolean }> };
  };
}

/** A Durable Object's state (Cloudflare's runtime): only what src/server/quiz-duel.ts uses. */
interface DurableObjectState {
  blockConcurrencyWhile(callback: () => Promise<void>): Promise<void>;
  acceptWebSocket(socket: WebSocket): void;
  getWebSockets(): WebSocket[];
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put(key: string, value: unknown): Promise<void>;
    getAlarm(): Promise<number | null>;
    setAlarm(time: number): Promise<void>;
    deleteAll(): Promise<void>;
  };
}

/** Cloudflare's pair of connected WebSockets: one answered to the browser, one kept. */
declare class WebSocketPair {
  0: WebSocket;
  1: WebSocket;
}

interface WebSocket {
  /** Data kept with a hibernating socket (Cloudflare's runtime). */
  serializeAttachment(value: unknown): void;
  deserializeAttachment(): unknown;
}

interface ResponseInit {
  /** The socket a 101 answer hands to the browser (Cloudflare's runtime). */
  webSocket?: WebSocket;
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
        action: string;
        theme: 'auto' | 'dark';
        appearance: 'always' | 'interaction-only';
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

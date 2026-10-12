/**
 * Error tracking with Sentry (EU region): the options shared by the server (src/worker.ts) and
 * the browser (src/scripts/error-reporting.ts). Reports only where PUBLIC_SENTRY_DSN is set,
 * i.e. the deployed site (astro.config.mjs).
 *
 * Without a DSN nothing is sent, though the server wrapper still runs (the same code as in
 * production).
 *
 * Errors only (no tracing, logs or session replay), and none of the request data Sentry collects
 * by default except the browser type: comment requests carry commenters' emails in their bodies, and unsubscribe links a
 * token in their query. Sentry's project settings also drop IP addresses ("Prevent Storing of IP
 * Addresses").
 */
/** Email addresses in logged messages (a failed email's error may name its recipient). */
const EMAIL = /[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}/gi;

export const sentryOptions = (dsn: string) => ({
  dsn,
  enabled: dsn !== '',
  dataCollection: {
    userInfo: false,
    cookies: false,
    // The browser and system (in the User-Agent) only; not Referer or anything else.
    httpHeaders: { allow: ['user-agent'] },
    httpBodies: [],
    urlQueryParams: false,
  },
  // Console lines logged before an error come with it (on the server, Astro logs the error behind
  // a 500 there): as text without email addresses, and without the logged values themselves.
  beforeBreadcrumb: <B extends { category?: string | undefined; message?: string | undefined }>(
    breadcrumb: B,
  ): B =>
    breadcrumb.category === 'console'
      ? { ...breadcrumb, message: breadcrumb.message?.replace(EMAIL, '[email]'), data: undefined }
      : breadcrumb,
});

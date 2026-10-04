/**
 * Reports JavaScript errors and Content-Security-Policy blocks in visitors' browsers to the Worker
 * logs (src/pages/api/client-errors.ts), so a page that breaks only in some browser is noticed.
 * A few lines instead of a hosted service (Sentry and the like): no third party receives visitor
 * data, and the Worker logs already exist. Only errors from this site's own scripts are sent:
 * browser extensions inject scripts that fail on their own.
 */

const ENDPOINT = '/api/client-errors/';
const MAX_REPORTS = 5;
const sent = new Set<string>();

const isOwn = (url: string) => {
  try {
    return new URL(url, location.href).origin === location.origin;
  } catch {
    return false;
  }
};

function report(kind: 'error' | 'rejection' | 'csp', message: string, source = '', stack = '') {
  const key = `${kind}|${message}|${source}`;
  if (sent.size >= MAX_REPORTS || sent.has(key)) return;
  sent.add(key);
  // sendBeacon survives the page closing; a string body is sent as text/plain (no CORS preflight).
  navigator.sendBeacon(
    ENDPOINT,
    JSON.stringify({ kind, message, page: location.pathname, source, stack }),
  );
}

addEventListener('error', (event) => {
  if (!event.filename || !isOwn(event.filename)) return;
  const error: unknown = event.error;
  report(
    'error',
    event.message,
    `${event.filename}:${event.lineno}:${event.colno}`,
    error instanceof Error ? (error.stack ?? '') : '',
  );
});

addEventListener('unhandledrejection', (event) => {
  // Embedded third-party code (Turnstile) and extensions reject on this window too; only
  // rejections whose stack passes through this site's scripts are ours.
  const reason: unknown = event.reason;
  if (!(reason instanceof Error) || !reason.stack?.includes(location.origin)) return;
  report('rejection', reason.message, '', reason.stack);
});

/** A blocked URL without its query or fragment, which may carry identifiers. */
const withoutQuery = (uri: string) => {
  try {
    const url = new URL(uri);
    return url.origin + url.pathname;
  } catch {
    return uri; // 'inline', 'eval' and the like
  }
};

document.addEventListener('securitypolicyviolation', (event) => {
  // Extensions' own requests and injected scripts and styles trip the policy too, often without
  // a source file; only blocks caused by the site's own files matter.
  if (!event.sourceFile || !isOwn(event.sourceFile)) return;
  if (/^(chrome|moz|safari-web)-extension:/.test(event.blockedURI)) return;
  report(
    'csp',
    `${event.effectiveDirective} blocked ${withoutQuery(event.blockedURI)}`,
    withoutQuery(event.sourceFile),
  );
});

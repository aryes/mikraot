/**
 * Reports JavaScript errors and Content-Security-Policy blocks in visitors' browsers to Sentry
 * (options in src/lib/sentry.ts), so a page that breaks only in some browser is noticed.
 *
 * Sentry's code (about 30 kB compressed) loads only once the page is idle, so it never delays a
 * page: errors that happen earlier are held here and sent once it has loaded. Without a DSN (any
 * build but the deployed site's) nothing is loaded or sent.
 */
import { PUBLIC_SENTRY_DSN } from 'astro:env/client';
import { sentryOptions } from '../lib/sentry';

/** Errors held until Sentry has loaded; at most a few, as a page rarely has more than one. */
const MAX_HELD = 10;
type Report = { error: unknown } | { message: string };
let send: ((report: Report) => void) | undefined;
const held: Report[] = [];

function report(item: Report) {
  if (send) send(item);
  else if (held.length < MAX_HELD) held.push(item);
}

const isOwn = (url: string) => {
  try {
    return new URL(url, location.href).origin === location.origin;
  } catch {
    return false;
  }
};

/** A URL without its query or fragment, which may carry identifiers. */
const withoutQuery = (uri: string) => {
  try {
    const url = new URL(uri);
    return url.origin + url.pathname;
  } catch {
    return uri; // 'inline', 'eval' and the like
  }
};

/** Errors before Sentry loads (Sentry's own handlers take over after; allowUrls filters both). */
const onError = (event: ErrorEvent) => {
  if (event.filename && isOwn(event.filename)) report({ error: event.error ?? event.message });
};
const onRejection = (event: PromiseRejectionEvent) => {
  const reason: unknown = event.reason;
  if (reason instanceof Error && reason.stack?.includes(location.origin)) report({ error: reason });
};

async function start() {
  // Named, so the bundler keeps only these parts of the SDK.
  const { init, captureException, captureMessage } = await import('@sentry/browser');
  init({
    ...sentryOptions(PUBLIC_SENTRY_DSN),
    // Only errors whose stack passes through this site's own scripts: browser extensions inject
    // scripts that fail on their own, and embedded Turnstile and YouTube report to their owners.
    // (Sentry's allowUrls would let through errors with no script address, like a rejection with
    // a string.) CSP blocks, sent as messages, are filtered when they happen.
    beforeSend: (event) =>
      event.exception?.values?.some((value) =>
        value.stacktrace?.frames?.some((frame) =>
          frame.filename?.startsWith(`${location.origin}/`),
        ),
      ) === false
        ? null
        : event,
    // No session counts (Umami counts visits): Sentry receives only errors.
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== 'BrowserSession'),
  });
  removeEventListener('error', onError);
  removeEventListener('unhandledrejection', onRejection);
  send = (item) => {
    if ('error' in item)
      captureException(item.error, { mechanism: { handled: false, type: 'onerror' } });
    else captureMessage(item.message, 'warning');
  };
  for (const item of held.splice(0)) send(item);
}

if (PUBLIC_SENTRY_DSN) {
  addEventListener('error', onError);
  addEventListener('unhandledrejection', onRejection);

  // A CSP set in a <meta> tag can't name a report address, so blocks are reported from here.
  document.addEventListener('securitypolicyviolation', (event) => {
    // Extensions' own requests and injected scripts and styles trip the policy too, often without
    // a source file; only blocks caused by the site's own files matter.
    if (!event.sourceFile || !isOwn(event.sourceFile)) return;
    if (/^(chrome|moz|safari-web)-extension:/.test(event.blockedURI)) return;
    report({
      message: `CSP: ${event.effectiveDirective} blocked ${withoutQuery(event.blockedURI)} (${withoutQuery(event.sourceFile)})`,
    });
  });

  const whenIdle = () =>
    'requestIdleCallback' in window
      ? requestIdleCallback(() => void start(), { timeout: 5000 })
      : setTimeout(() => void start(), 2000);
  if (document.readyState === 'complete') whenIdle();
  else addEventListener('load', whenIdle, { once: true });
}

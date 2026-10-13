/**
 * One-click unsubscribe from a mail app (RFC 8058): the app POSTs "List-Unsubscribe=One-Click" to
 * the address in the email's List-Unsubscribe header (reply emails: src/server/reply-notice.ts;
 * the newsletter's welcome email: src/server/newsletter.ts). It comes from the mail provider, not
 * from this site, so Astro's cross-site form check would refuse it; the Worker answers it before
 * Astro (src/worker.ts). The secret token is what authorises it.
 */

/** Which emails each unsubscribe page stops. */
const PAGES = new Map<string, 'replies' | 'newsletter'>([
  ['/unsubscribe/', 'replies'],
  ['/newsletter/unsubscribe/', 'newsletter'],
]);

export interface OneClickUnsubscribe {
  stop: 'replies' | 'newsletter';
  token: string;
}

/** The request's unsubscribe if it is a one-click unsubscribe, otherwise null. */
export async function oneClickUnsubscribe(request: Request): Promise<OneClickUnsubscribe | null> {
  if (request.method !== 'POST') return null;
  const url = new URL(request.url);
  const path = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  const stop = PAGES.get(path);
  const token = url.searchParams.get('token');
  if (!stop || !token) return null;
  const body = await request.clone().text();
  return new URLSearchParams(body).get('List-Unsubscribe') === 'One-Click' ? { stop, token } : null;
}

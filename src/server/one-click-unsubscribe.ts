/**
 * One-click unsubscribe from a mail app (RFC 8058): the app POSTs "List-Unsubscribe=One-Click" to
 * the address in the email's List-Unsubscribe header (src/server/reply-notice.ts). It comes from
 * the mail provider, not from this site, so Astro's cross-site form check would refuse it; the
 * Worker answers it before Astro (src/worker.ts). The secret token is what authorises it.
 */

/** The unsubscribe token if this is a one-click unsubscribe request, otherwise null. */
export async function oneClickUnsubscribeToken(request: Request): Promise<string | null> {
  if (request.method !== 'POST') return null;
  const url = new URL(request.url);
  if (url.pathname !== '/unsubscribe/' && url.pathname !== '/unsubscribe') return null;
  const token = url.searchParams.get('token');
  if (!token) return null;
  const body = await request.clone().text();
  return new URLSearchParams(body).get('List-Unsubscribe') === 'One-Click' ? token : null;
}

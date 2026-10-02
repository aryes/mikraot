/**
 * Cloudflare Turnstile ("are you human?") check for posted comments.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** The widget's token, sent alongside the comment fields (checked, not stored). */
export function tokenFrom(body: unknown): string {
  const token = body && typeof body === 'object' ? Reflect.get(body, 'turnstile_token') : undefined;
  return typeof token === 'string' ? token : '';
}

/** Asks Cloudflare whether a token from the widget is valid. Each token works only once. */
export async function verifyTurnstile(
  secret: string,
  token: string,
  remoteIp: string,
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  if (!token) return false;
  const res = await fetchFn(SITEVERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: remoteIp }),
  });
  if (!res.ok) throw new Error(`Turnstile siteverify: ${res.status}`);
  const result: unknown = await res.json();
  return typeof result === 'object' && result !== null && Reflect.get(result, 'success') === true;
}

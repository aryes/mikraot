/**
 * Cloudflare Turnstile ("are you human?") check for posted comments and newsletter sign-ups.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** Cloudflare has 10 seconds in its example; a visitor shouldn't wait that long. */
const TIMEOUT_MS = 5000;

/** The form a check was made for: a token from one is refused by the other. */
export type TurnstileAction = 'comment' | 'newsletter';

/**
 * Cloudflare's public test secrets (local runs, tests and branch previews) answer with placeholder
 * hostname and action values, so those two checks apply with the real secret only.
 */
const isTestSecret = (secret: string) => /^[123]x0{31}AA$/.test(secret);

/** The widget's token, sent alongside the form's fields (checked, not stored). */
export function tokenFrom(body: unknown): string {
  const token = body && typeof body === 'object' ? Reflect.get(body, 'turnstile_token') : undefined;
  return typeof token === 'string' ? token : '';
}

/**
 * Asks Cloudflare whether a token from the widget is valid: solved, on this site (`hostname`),
 * for this form (`action`). Each token works only once. Throws if Cloudflare doesn't answer
 * within 5 seconds or answers with an error: a server error, so the visitor is asked to try again
 * and the Worker emails Arye (src/worker.ts).
 */
export async function verifyTurnstile(options: {
  /** The secret key (TURNSTILE_SECRET_KEY). */
  key: string;
  token: string;
  remoteIp: string;
  hostname: string;
  action: TurnstileAction;
  fetchFn?: typeof fetch;
}): Promise<boolean> {
  const { key, token, remoteIp, hostname, action, fetchFn = fetch } = options;
  if (!token) return false;
  const res = await fetchFn(SITEVERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret: key, response: token, remoteip: remoteIp }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Turnstile siteverify: ${res.status}`);
  const result: unknown = await res.json();
  if (typeof result !== 'object' || result === null) return false;
  if (Reflect.get(result, 'success') !== true) return false;
  if (isTestSecret(key)) return true;
  return Reflect.get(result, 'hostname') === hostname && Reflect.get(result, 'action') === action;
}

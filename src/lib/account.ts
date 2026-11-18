/**
 * The browser's side of signing in (src/server/auth.ts): plain requests to Better Auth's API.
 * Not Better Auth's own client: the site needs five requests, and its client brings a store and
 * React bindings the page would load for nothing.
 */

const API = '/api/auth';

/**
 * Remembered in this browser while signed in (only that: not the address), so pages can show it
 * without asking the server.
 */
export const SIGNED_IN_KEY = 'signed-in';

export interface Account {
  email: string;
  name: string;
}

const asAccount = (data: unknown): Account | null => {
  const user = data && typeof data === 'object' ? Reflect.get(data, 'user') : undefined;
  if (!user || typeof user !== 'object') return null;
  const [email, name] = [Reflect.get(user, 'email'), Reflect.get(user, 'name')];
  return typeof email === 'string' ? { email, name: typeof name === 'string' ? name : '' } : null;
};

export function remember(account: Account | null): void {
  try {
    if (account) localStorage.setItem(SIGNED_IN_KEY, '1');
    else localStorage.removeItem(SIGNED_IN_KEY);
  } catch {
    // Storage blocked: the header just doesn't show it.
  }
  document.dispatchEvent(new CustomEvent('account-change'));
}

export function signedInHere(): boolean {
  try {
    return localStorage.getItem(SIGNED_IN_KEY) !== null;
  } catch {
    return false;
  }
}

/** Who is signed in on this browser, if anyone. Throws if the server can't be reached. */
export async function currentAccount(): Promise<Account | null> {
  const res = await fetch(`${API}/get-session`, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`get-session: ${res.status}`);
  return asAccount(await res.json());
}

export type LinkRequest =
  | { ok: true; /** Only where no email is sent (local runs, tests, previews). */ link?: string }
  | { ok: false; status: number };

/** Asks for a sign-in link to be emailed. */
export async function requestLink(email: string, turnstileToken: string): Promise<LinkRequest> {
  const res = await fetch(`${API}/sign-in/magic-link`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, turnstile_token: turnstileToken }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const data: unknown = await res.json();
  const link = data && typeof data === 'object' ? Reflect.get(data, 'link') : undefined;
  return typeof link === 'string' ? { ok: true, link } : { ok: true };
}

/** Signs in with a link's token. Null if the link was already used or has expired. */
export async function signInWithToken(token: string): Promise<Account | null> {
  const res = await fetch(`${API}/magic-link/verify?${new URLSearchParams({ token }).toString()}`, {
    // A bad token is answered with a redirect, not an error.
    redirect: 'manual',
    credentials: 'same-origin',
  });
  if (!res.ok) return null;
  return asAccount(await res.json());
}

export async function signOut(): Promise<void> {
  const res = await fetch(`${API}/sign-out`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`sign-out: ${res.status}`);
}

/**
 * Deletes the account and everything kept with it. 'stale' when the sign-in is over a day old:
 * deleting asks for a recent one (Better Auth's `freshAge`).
 */
export async function deleteAccount(): Promise<'deleted' | 'stale'> {
  const res = await fetch(`${API}/delete-user`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (res.ok) return 'deleted';
  const data: unknown = await res.json().catch(() => null);
  const code = data && typeof data === 'object' ? Reflect.get(data, 'code') : undefined;
  if (code === 'SESSION_EXPIRED') return 'stale';
  throw new Error(`delete-user: ${res.status}`);
}

/**
 * Signed links: a token carries its value and an HMAC-SHA-256 signature of it, made with a secret
 * only the Worker has, so no list of tokens needs keeping and nobody can make one for a value they
 * didn't receive a link for. Each use names its purpose, which is signed too, so a token made for
 * one use is refused by another even under the same secret.
 */

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
const fromBase64url = (encoded: string) =>
  Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0));
const hmacKey = (secret: string) =>
  crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
const signedText = (purpose: string, value: string) =>
  new TextEncoder().encode(`${purpose}:${value}`);

/** The token for `value`: the value (encoded) and its signature. */
export async function signToken(secret: string, purpose: string, value: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    signedText(purpose, value),
  );
  return `${base64url(new TextEncoder().encode(value))}.${base64url(new Uint8Array(signature))}`;
}

/** The value a token was made for, or null if it isn't one of ours (or no secret is set). */
export async function readToken(
  secret: string,
  purpose: string,
  token: string,
): Promise<string | null> {
  const [encoded, signature, rest] = token.split('.');
  if (!secret || !encoded || !signature || rest !== undefined) return null;
  try {
    const value = new TextDecoder().decode(fromBase64url(encoded));
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      fromBase64url(signature),
      signedText(purpose, value),
    );
    return valid ? value : null;
  } catch {
    return null; // not base64url
  }
}

/**
 * The security headers of public/_headers, for the answers the Worker gives itself (API routes,
 * the unsubscribe and comment-management pages, the comments feed, recordings): Cloudflare
 * applies _headers to static files only. src/server/security-headers.test.ts keeps this list the
 * same as the file's `/*` block. Headers in Worker code rather than Cloudflare's Transform Rules:
 * these are in git, tested, and apply to previews too (the review, 2026-10-19).
 */

export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

const FRAME_ANCESTORS = "frame-ancestors 'none'";

/**
 * Adds the headers a response lacks; one it sets itself wins (a page's stricter Referrer-Policy).
 * Astro's own Content-Security-Policy header (pages answered on demand) gets `frame-ancestors`
 * added, which a <meta> policy can't carry.
 */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  const policy = headers.get('Content-Security-Policy') ?? '';
  if (!policy.includes('frame-ancestors')) {
    headers.set('Content-Security-Policy', `${policy.replace(/;?\s*$/, '')}; ${FRAME_ANCESTORS}`);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

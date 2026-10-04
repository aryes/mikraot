/**
 * security.txt (RFC 9116): how to report a security problem. Built with every deploy, so
 * `Expires` (required; the RFC advises less than a year ahead) moves forward with each release.
 * It lapses if nothing is deployed for VALID_DAYS (dependency updates alone redeploy often).
 */
const SECURITY_CONTACT = 'mailto:admin@mikraot.net';
const VALID_DAYS = 330;

export function securityTxt(site: URL, now: Date): string {
  const expires = new Date(now.getTime() + VALID_DAYS * 24 * 60 * 60 * 1000);
  return [
    `Contact: ${SECURITY_CONTACT}`,
    // Whole seconds: some scanners reject fractional seconds.
    `Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
    'Preferred-Languages: he, en',
    `Canonical: ${new URL('/.well-known/security.txt', site).href}`,
    '',
  ].join('\n');
}

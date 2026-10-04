import { describe, expect, it } from 'vitest';
import { securityTxt } from './security-txt';

describe('securityTxt', () => {
  const text = securityTxt(new URL('https://mikraot.net'), new Date('2026-10-05T00:00:00Z'));

  it('has the fields RFC 9116 requires, and a canonical URL', () => {
    expect(text).toContain('Contact: mailto:admin@mikraot.net\n');
    expect(text).toContain('Canonical: https://mikraot.net/.well-known/security.txt\n');
  });

  it('expires less than a year after the build', () => {
    expect(text).toContain('Expires: 2027-08-31T00:00:00Z\n');
  });
});

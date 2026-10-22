import { describe, expect, it } from 'vitest';
import { decodeEmail, encodeEmail } from './email-obfuscation';

describe('email obfuscation', () => {
  it('round-trips an address, which the encoded form does not contain', () => {
    const encoded = encodeEmail('admin@mikraot.net');
    expect(encoded).toMatch(/^[0-9a-f]+$/);
    expect(encoded).not.toContain('mikraot');
    expect(decodeEmail(encoded)).toBe('admin@mikraot.net');
  });
});

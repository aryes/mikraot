import { describe, expect, it } from 'vitest';
import { rateLimitKey } from './rate-limit-key';

describe('rateLimitKey', () => {
  it('keeps an IPv4 address as it is', () => {
    expect(rateLimitKey('203.0.113.7')).toBe('203.0.113.7');
    expect(rateLimitKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
  });

  it('keys IPv6 addresses on their /64 network, however they are written', () => {
    const key = '2001:db8:aa:1::/64';
    expect(rateLimitKey('2001:db8:aa:1:1:2:3:4')).toBe(key);
    expect(rateLimitKey('2001:0DB8:00aa:0001:ffff::9')).toBe(key);
    expect(rateLimitKey('2001:db8:aa:1::')).toBe(key);
    expect(rateLimitKey('2001:db8::1')).toBe('2001:db8::/64');
    expect(rateLimitKey('::1')).toBe('::/64');
    expect(rateLimitKey('fe80::1%eth0')).toBe('fe80::/64');
  });

  it('passes anything else through (e.g. the local dev server)', () => {
    expect(rateLimitKey('not an address')).toBe('not an address');
  });
});

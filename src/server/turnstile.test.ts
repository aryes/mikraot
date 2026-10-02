import { describe, expect, it, vi } from 'vitest';
import { tokenFrom, verifyTurnstile } from './turnstile';

const reply = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));

describe('tokenFrom', () => {
  it('reads the token field, or nothing', () => {
    expect(tokenFrom({ turnstile_token: 'abc' })).toBe('abc');
    expect(tokenFrom({ turnstile_token: 42 })).toBe('');
    expect(tokenFrom(null)).toBe('');
  });
});

describe('verifyTurnstile', () => {
  it('sends the secret, token and visitor IP, and accepts a successful check', async () => {
    const fetchFn = reply({ success: true });
    expect(await verifyTurnstile('secret', 'token', '203.0.113.7', fetchFn)).toBe(true);
    const body = fetchFn.mock.calls[0]?.[1]?.body;
    expect(typeof body === 'string' && JSON.parse(body)).toEqual({
      secret: 'secret',
      response: 'token',
      remoteip: '203.0.113.7',
    });
  });

  it('rejects a failed check, and a missing token without asking', async () => {
    expect(await verifyTurnstile('s', 't', 'ip', reply({ success: false }))).toBe(false);
    const fetchFn = reply({ success: true });
    expect(await verifyTurnstile('s', '', 'ip', fetchFn)).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('fails loudly if Cloudflare cannot be reached', async () => {
    await expect(verifyTurnstile('s', 't', 'ip', reply({}, 500))).rejects.toThrow('500');
  });
});

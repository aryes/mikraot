import { describe, expect, it, vi } from 'vitest';
import { tokenFrom, verifyTurnstile } from './turnstile';

const reply = (body: unknown, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(Response.json(body, { status }));

const TEST_SECRET = '1x0000000000000000000000000000000AA';
const check = (fetchFn: typeof fetch, overrides: { key?: string; token?: string } = {}) =>
  verifyTurnstile({
    key: 'real-key',
    token: 'token',
    remoteIp: '203.0.113.7',
    hostname: 'mikraot.net',
    action: 'comment',
    fetchFn,
    ...overrides,
  });

describe('tokenFrom', () => {
  it('reads the token field, or nothing', () => {
    expect(tokenFrom({ turnstile_token: 'abc' })).toBe('abc');
    expect(tokenFrom({ turnstile_token: 42 })).toBe('');
    expect(tokenFrom(null)).toBe('');
  });
});

describe('verifyTurnstile', () => {
  const solved = { success: true, hostname: 'mikraot.net', action: 'comment' };

  it('sends the secret, token and visitor IP, and accepts a check solved here for this form', async () => {
    const fetchFn = reply(solved);
    expect(await check(fetchFn)).toBe(true);
    const init = fetchFn.mock.calls[0]?.[1];
    expect(typeof init?.body === 'string' && JSON.parse(init.body)).toEqual({
      secret: 'real-key',
      response: 'token',
      remoteip: '203.0.113.7',
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal); // gives up on a slow answer
  });

  it('refuses a check solved on another site, or for the other form', async () => {
    expect(await check(reply({ ...solved, hostname: 'evil.example' }))).toBe(false);
    expect(await check(reply({ ...solved, action: 'newsletter' }))).toBe(false);
    expect(await check(reply({ success: true }))).toBe(false);
  });

  it("accepts the test keys' placeholder hostname and action (local runs, previews)", async () => {
    const placeholder = reply({ success: true, hostname: 'localhost', action: 'test' });
    expect(await check(placeholder, { key: TEST_SECRET })).toBe(true);
  });

  it('rejects a failed check, and a missing token without asking', async () => {
    expect(await check(reply({ success: false }))).toBe(false);
    const fetchFn = reply(solved);
    expect(await check(fetchFn, { token: '' })).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('fails loudly if Cloudflare cannot be reached', async () => {
    await expect(check(reply({}, 500))).rejects.toThrow('500');
  });
});

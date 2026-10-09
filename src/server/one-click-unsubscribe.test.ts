import { describe, expect, it } from 'vitest';
import { oneClickUnsubscribeToken } from './one-click-unsubscribe';

const post = (path: string, body: string) =>
  new Request(`https://mikraot.net${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

describe('oneClickUnsubscribeToken', () => {
  it('recognises a mail app’s one-click POST and returns its token', async () => {
    expect(
      await oneClickUnsubscribeToken(post('/unsubscribe/?token=abc', 'List-Unsubscribe=One-Click')),
    ).toBe('abc');
  });

  it('leaves everything else to the site', async () => {
    expect(await oneClickUnsubscribeToken(post('/unsubscribe/?token=abc', ''))).toBeNull();
    expect(
      await oneClickUnsubscribeToken(
        post('/api/comments/?token=abc', 'List-Unsubscribe=One-Click'),
      ),
    ).toBeNull();
    expect(
      await oneClickUnsubscribeToken(post('/unsubscribe/', 'List-Unsubscribe=One-Click')),
    ).toBeNull();
    expect(
      await oneClickUnsubscribeToken(new Request('https://mikraot.net/unsubscribe/?token=abc')),
    ).toBeNull();
  });

  it('leaves the body readable for the site', async () => {
    const request = post('/unsubscribe/?token=abc', 'other=1');
    await oneClickUnsubscribeToken(request);
    expect(await request.text()).toBe('other=1');
  });
});

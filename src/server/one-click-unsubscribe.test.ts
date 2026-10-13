import { describe, expect, it } from 'vitest';
import { oneClickUnsubscribe } from './one-click-unsubscribe';

const post = (path: string, body: string) =>
  new Request(`https://mikraot.net${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

describe('oneClickUnsubscribe', () => {
  it('recognises a mail app’s one-click POST: which emails to stop, and its token', async () => {
    expect(
      await oneClickUnsubscribe(post('/unsubscribe/?token=abc', 'List-Unsubscribe=One-Click')),
    ).toEqual({ stop: 'replies', token: 'abc' });
    expect(
      await oneClickUnsubscribe(
        post('/newsletter/unsubscribe?token=x.y', 'List-Unsubscribe=One-Click'),
      ),
    ).toEqual({ stop: 'newsletter', token: 'x.y' });
  });

  it('leaves everything else to the site', async () => {
    expect(await oneClickUnsubscribe(post('/unsubscribe/?token=abc', ''))).toBeNull();
    expect(
      await oneClickUnsubscribe(post('/api/comments/?token=abc', 'List-Unsubscribe=One-Click')),
    ).toBeNull();
    expect(
      await oneClickUnsubscribe(post('/unsubscribe/', 'List-Unsubscribe=One-Click')),
    ).toBeNull();
    expect(
      await oneClickUnsubscribe(new Request('https://mikraot.net/unsubscribe/?token=abc')),
    ).toBeNull();
  });

  it('leaves the body readable for the site', async () => {
    const request = post('/unsubscribe/?token=abc', 'other=1');
    await oneClickUnsubscribe(request);
    expect(await request.text()).toBe('other=1');
  });
});

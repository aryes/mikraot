import { describe, expect, it } from 'vitest';
import { commentIdFromToken, manageToken, manageUrl } from './comment-manage';
import { signToken } from './signing';

describe('comment management links', () => {
  it('name their comment, readable only with the same key', async () => {
    const token = await manageToken('s3cret', 42);
    expect(await commentIdFromToken('s3cret', token)).toBe(42);
    expect(await commentIdFromToken('other', token)).toBeNull();
    expect(await commentIdFromToken('', token)).toBeNull();
  });

  it('refuse a token for another comment, or made for another use', async () => {
    const [, signature] = (await manageToken('s3cret', 42)).split('.');
    expect(await commentIdFromToken('s3cret', `${btoa('43')}.${signature}`)).toBeNull();
    const unsubscribe = await signToken('s3cret', 'newsletter-unsubscribe', '42');
    expect(await commentIdFromToken('s3cret', unsubscribe)).toBeNull();
    const notNumber = await signToken('s3cret', 'comment-manage', '4x');
    expect(await commentIdFromToken('s3cret', notNumber)).toBeNull();
  });

  it('open the management page with the token', async () => {
    const url = new URL(await manageUrl('s3cret', 'https://mikraot.net', 7));
    expect(url.pathname).toBe('/comments/manage/');
    expect(await commentIdFromToken('s3cret', url.searchParams.get('token') ?? '')).toBe(7);
  });
});

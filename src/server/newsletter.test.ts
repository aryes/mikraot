import { describe, expect, it, vi } from 'vitest';
import {
  addedToList,
  CONFIRM_TEMPLATE_ID,
  isBlocked,
  NEWSLETTER_LIST_ID,
  parseSignup,
  requestConfirmation,
  sameSecret,
  subscriberNotice,
  welcome,
  welcomeEmail,
} from './newsletter';

/** The JSON a mocked fetch was called with. */
const sentBody = (init: RequestInit | undefined): unknown =>
  JSON.parse(typeof init?.body === 'string' ? init.body : '');

describe('parseSignup', () => {
  it('takes the email (lower-cased) and an optional name, trimmed', () => {
    expect(parseSignup({ email: ' Dana@Example.com ', name: ' דנה ' })).toEqual({
      email: 'dana@example.com',
      name: 'דנה',
    });
    expect(parseSignup({ email: 'a@b.co' })).toEqual({ email: 'a@b.co', name: '' });
  });

  it('refuses a missing or malformed email and an overlong name', () => {
    expect(parseSignup({})).toEqual({ error: 'Invalid email' });
    expect(parseSignup({ email: 'not an email' })).toEqual({ error: 'Invalid email' });
    expect(parseSignup({ email: 42 })).toEqual({ error: 'Invalid email' });
    expect(parseSignup({ email: 'a@b.co', name: 'x'.repeat(101) })).toEqual({
      error: 'Name too long',
    });
  });
});

describe('isBlocked', () => {
  it('blocks mail.ru and its subdomains only', () => {
    expect(isBlocked('x@mail.ru')).toBe(true);
    expect(isBlocked('x@list.mail.ru')).toBe(true);
    expect(isBlocked('x@gmail.ru')).toBe(false);
    expect(isBlocked('x@example.com')).toBe(false);
  });
});

describe('requestConfirmation', () => {
  it('asks Brevo for a double opt-in to the list, returning to our confirmation page', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 201 }));
    await requestConfirmation(
      'key',
      { email: 'a@b.co', name: 'דנה' },
      'https://mikraot.net',
      fetchFn,
    );
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe('https://api.brevo.com/v3/contacts/doubleOptinConfirmation');
    expect(new Headers(init?.headers).get('api-key')).toBe('key');
    expect(sentBody(init)).toEqual({
      email: 'a@b.co',
      attributes: { FIRSTNAME: 'דנה' },
      includeListIds: [NEWSLETTER_LIST_ID],
      templateId: CONFIRM_TEMPLATE_ID,
      redirectionUrl: 'https://mikraot.net/newsletter/confirmed/',
    });
  });

  it('sends no name attribute without a name; a refused address is logged, not thrown', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('bad', { status: 400 }));
    await expect(
      requestConfirmation('key', { email: 'a@b.co', name: '' }, 'https://x.example', fetchFn),
    ).resolves.toBe('refused');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('400 bad'));
    log.mockRestore();
    expect(sentBody(fetchFn.mock.calls[0]?.[1])).not.toHaveProperty('attributes');
  });
});

describe('requestConfirmation when Brevo is down', () => {
  it('throws, so the visitor is told to try again', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('down', { status: 503 }));
    await expect(
      requestConfirmation('key', { email: 'a@b.co', name: '' }, 'https://x.example', fetchFn),
    ).rejects.toThrow('503 down');
  });
});

describe('addedToList', () => {
  const event = { event: 'list_addition', email: 'A@B.co', list_id: [12, NEWSLETTER_LIST_ID] };

  it('returns the addresses added to the newsletter list, one event or a batch', () => {
    expect(addedToList(event)).toEqual(['a@b.co']);
    expect(addedToList([event, { ...event, email: 'c@d.co' }])).toEqual(['a@b.co', 'c@d.co']);
  });

  it('ignores other events, other lists and junk', () => {
    expect(addedToList({ ...event, event: 'unsubscribed' })).toEqual([]);
    expect(addedToList({ ...event, list_id: [12] })).toEqual([]);
    expect(addedToList({ ...event, email: '' })).toEqual([]);
    expect(addedToList(null)).toEqual([]);
    expect(addedToList('x')).toEqual([]);
  });
});

describe('welcome', () => {
  it('sends the welcome email to the subscriber, then tells the owner', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 201 }));
    await welcome('key', 'a@b.co', 'https://mikraot.net/', fetchFn);
    const sent = fetchFn.mock.calls.map(([, init]) => sentBody(init));
    expect(sent).toEqual([
      welcomeEmail('a@b.co', 'https://mikraot.net/'),
      subscriberNotice('a@b.co'),
    ]);
    expect(subscriberNotice('a@b.co').to).toEqual([{ email: 'admin@mikraot.net' }]);
  });

  it('escapes the address in the owner notice', () => {
    expect(subscriberNotice('<b>@x.co').htmlContent).toContain('&lt;b&gt;@x.co');
  });
});

describe('sameSecret', () => {
  it('matches only the same non-empty secret', async () => {
    expect(await sameSecret('s3cret', 's3cret')).toBe(true);
    expect(await sameSecret('s3cre', 's3cret')).toBe(false);
    expect(await sameSecret('', '')).toBe(false);
  });
});

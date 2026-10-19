import { describe, expect, it, vi } from 'vitest';
import {
  addedToList,
  CONFIRM_TEMPLATE_ID,
  emailFromToken,
  isBlocked,
  NEWSLETTER_LIST_ID,
  parseSignup,
  removeFromList,
  requestConfirmation,
  sameSecret,
  subscriberNotice,
  unsubscribeNewsletter,
  unsubscribeToken,
  welcome,
  welcomeEmail,
} from './newsletter';

/** The JSON a mocked fetch was called with. */
const sentBody = (init: RequestInit | undefined): unknown =>
  JSON.parse(typeof init?.body === 'string' ? init.body : '');

const answer = (body: string, status: number) =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { status }));
// Brevo's answer to a removal: 201 with the addresses removed.
const removed = () => answer('{"contacts":{"success":["a@b.co"]}}', 201);

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

  it('sends no name attribute without a name', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 201 }));
    await requestConfirmation('key', { email: 'a@b.co', name: '' }, 'https://x.example', fetchFn);
    expect(sentBody(fetchFn.mock.calls[0]?.[1])).not.toHaveProperty('attributes');
  });
});

describe('requestConfirmation when Brevo sends nothing', () => {
  it.each([
    [503, 'down'],
    [400, '{"code":"not_enough_credits"}'],
    [400, '{"code":"invalid_parameter"}'],
    [429, 'Too many requests'],
  ])('throws on %i, so the visitor is told nothing was sent', async (status, reply) => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response(reply, { status }));
    await expect(
      requestConfirmation('key', { email: 'a@b.co', name: '' }, 'https://x.example', fetchFn),
    ).rejects.toThrow(`${status} ${reply}`);
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
  it('sends the welcome email, with a working unsubscribe link, then tells the owner', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 201 }));
    await welcome(
      {
        apiKey: 'key',
        secret: 's3cret',
        subscriber: 'a@b.co',
        siteUrl: 'https://mikraot.net/',
        origin: 'https://mikraot.example',
      },
      fetchFn,
    );
    const token = await unsubscribeToken('s3cret', 'a@b.co');
    const unsubscribe = `https://mikraot.example/newsletter/unsubscribe/?token=${token}`;
    const sent = fetchFn.mock.calls.map(([, init]) => sentBody(init));
    expect(sent).toEqual([
      welcomeEmail('a@b.co', 'https://mikraot.net/', unsubscribe),
      subscriberNotice('a@b.co'),
    ]);
    expect(subscriberNotice('a@b.co').to).toEqual([{ email: 'admin@mikraot.net' }]);
  });

  it('offers the mail app one-click unsubscribe, and links it in the text', () => {
    const email = welcomeEmail('a@b.co', 'https://mikraot.net/', 'https://x.example/u?token=t');
    expect(email.headers).toEqual({
      'List-Unsubscribe': '<https://x.example/u?token=t>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
    expect(email.textContent).toContain('https://x.example/u?token=t');
    expect(email.htmlContent).toContain('href="https://x.example/u?token=t"');
  });

  it('escapes the address in the owner notice', () => {
    expect(subscriberNotice('<b>@x.co').htmlContent).toContain('&lt;b&gt;@x.co');
  });
});

describe('unsubscribe tokens', () => {
  it('give back the address they were made for, with the same secret only', async () => {
    const token = await unsubscribeToken('s3cret', 'dana@example.com');
    expect(token).toMatch(/^[\w-]+\.[\w-]+$/); // safe in a URL as is
    expect(await emailFromToken('s3cret', token)).toBe('dana@example.com');
    expect(await emailFromToken('other', token)).toBeNull();
    expect(await emailFromToken('', token)).toBeNull();
  });

  it.each(['דנה@דוגמה.ישראל', "o'brien+news@example.com"])(
    'work for any address, Hebrew or punctuation included: %s',
    async (email) => {
      const token = await unsubscribeToken('s3cret', email);
      expect(await emailFromToken('s3cret', token)).toBe(email);
    },
  );

  it('refuse a token for another address, and junk', async () => {
    const [, signature] = (await unsubscribeToken('s3cret', 'a@b.co')).split('.');
    const forged = `${btoa('victim@b.co')}.${signature}`;
    expect(await emailFromToken('s3cret', forged)).toBeNull();
    const junk = await Promise.all(
      ['', 'abc', 'a.b.c', '!!.??'].map((token) => emailFromToken('s3cret', token)),
    );
    expect(junk).toEqual([null, null, null, null]);
  });
});

describe('unsubscribeNewsletter', () => {
  it('removes the token’s address from the newsletter list', async () => {
    const fetchFn = removed();
    const token = await unsubscribeToken('s3cret', 'a@b.co');
    expect(await unsubscribeNewsletter({ apiKey: 'key', secret: 's3cret', token }, fetchFn)).toBe(
      true,
    );
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe(
      `https://api.brevo.com/v3/contacts/lists/${NEWSLETTER_LIST_ID}/contacts/remove`,
    );
    expect(sentBody(init)).toEqual({ emails: ['a@b.co'] });
  });

  it('does nothing for a bad token, and sends nothing without an API key', async () => {
    const fetchFn = removed();
    expect(
      await unsubscribeNewsletter({ apiKey: 'key', secret: 's3cret', token: 'x.y' }, fetchFn),
    ).toBe(false);
    const token = await unsubscribeToken('s3cret', 'a@b.co');
    expect(
      await unsubscribeNewsletter({ apiKey: undefined, secret: 's3cret', token }, fetchFn),
    ).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});

describe('removeFromList', () => {
  it('counts an address that is already gone as removed, and throws on other errors', async () => {
    const gone =
      '{"code":"invalid_parameter","message":"Contact already removed from list and/or does not exist"}';
    await expect(removeFromList('key', 'a@b.co', answer(gone, 400))).resolves.toBeUndefined();
    await expect(removeFromList('key', 'a@b.co', answer('down', 503))).rejects.toThrow('503 down');
  });
});

describe('sameSecret', () => {
  it('matches only the same non-empty secret', async () => {
    expect(await sameSecret('s3cret', 's3cret')).toBe(true);
    expect(await sameSecret('s3cre', 's3cret')).toBe(false);
    expect(await sameSecret('', '')).toBe(false);
  });
});

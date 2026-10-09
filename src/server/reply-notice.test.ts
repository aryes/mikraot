import { describe, expect, it, vi } from 'vitest';
import { notifyReplyAuthor, replyEmail, type ReplyNotice } from './reply-notice';

const notice: ReplyNotice = {
  recipient: { name: 'דנה', email: 'dana@example.com', unsubscribeToken: 'tok 1' },
  replyId: 12,
  replierName: 'אריה <b>',
  pageTitle: 'שווא נע',
  pageUrl: 'https://mikraot.net/שווא-נע/',
  origin: 'https://mikraot.net',
};

/** A Brevo that accepts. */
const accepting = () =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 201 }));

describe('replyEmail', () => {
  const email = replyEmail(notice);

  it('goes to the commenter, links to the reply, and escapes the replier’s name', () => {
    expect(email.to).toEqual([{ email: 'dana@example.com' }]);
    expect(email.subject).toBe('תשובה לתגובתך במקראות: שווא נע');
    expect(email.textContent).toContain('https://mikraot.net/שווא-נע/#comment-12');
    expect(email.htmlContent).toContain('אריה &lt;b&gt;');
    expect(email.htmlContent).not.toContain('<b>');
  });

  it('carries an unsubscribe link and the one-click headers', () => {
    const link = 'https://mikraot.net/unsubscribe/?token=tok%201';
    expect(email.textContent).toContain(link);
    expect(email.headers).toEqual({
      'List-Unsubscribe': `<${link}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });
});

describe('notifyReplyAuthor', () => {
  it('sends the email', async () => {
    const fetchFn = accepting();
    await notifyReplyAuthor({ apiKey: 'key', notice, replierEmail: 'x@y.co', fetchFn });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("doesn't tell people about their own replies, or send without a key", async () => {
    const fetchFn = accepting();
    await notifyReplyAuthor({ apiKey: 'key', notice, replierEmail: 'Dana@Example.com', fetchFn });
    await notifyReplyAuthor({ apiKey: undefined, notice, replierEmail: null, fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('never rejects when the send fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('no', { status: 500 }));
    await expect(
      notifyReplyAuthor({ apiKey: 'key', notice, replierEmail: null, fetchFn }),
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

import { describe, expect, it, vi } from 'vitest';
import type { EmailRetry } from './email';
import { commentEmail, notifyOwner, type CommentNotice } from './notify';

const notice: CommentNotice = {
  commentId: 7,
  pageTitle: 'דגש קל',
  pageUrl: 'https://mikraot.net/דגש-קל/',
  author: 'דנה',
  email: 'dana@example.com',
  content: 'שאלה <b>חשובה</b>\nשורה שנייה',
};

describe('commentEmail', () => {
  it('addresses the owner, links to the comment, and lets a reply reach the commenter', () => {
    const email = commentEmail(notice, 'admin@mikraot.net');
    expect(email.to).toEqual([{ email: 'admin@mikraot.net' }]);
    expect(email.replyTo).toEqual({ email: 'dana@example.com', name: 'דנה' });
    expect(email.subject).toBe('תגובה חדשה במקראות: דגש קל');
    expect(email.textContent).toContain('https://mikraot.net/דגש-קל/#comment-7');
    expect(email.textContent).toContain('שורה שנייה');
  });

  it('escapes the comment in the HTML version', () => {
    const { htmlContent } = commentEmail(notice, 'admin@mikraot.net');
    expect(htmlContent).toContain('&lt;b&gt;חשובה&lt;/b&gt;');
    expect(htmlContent).not.toContain('<b>חשובה');
  });

  it('offers the comment management link when there is one', () => {
    const manageUrl = 'https://mikraot.net/comments/manage/?token=a.b';
    const email = commentEmail({ ...notice, manageUrl }, 'admin@mikraot.net');
    expect(email.textContent).toContain(
      `ניהול התגובה (הסתרה או החזרה של התגובה באתר):\n${manageUrl}`,
    );
    expect(email.htmlContent).toContain(`<a href="${manageUrl}">ניהול התגובה</a>`);
    expect(commentEmail(notice, 'admin@mikraot.net').textContent).not.toContain('ניהול');
  });

  it('has no reply-to when the commenter gave no email', () => {
    expect(commentEmail({ ...notice, email: null }, 'a@b.c').replyTo).toBeUndefined();
  });
});

const ok = () => vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 201 }));
const broken = () => {
  throw new Error('no context');
};

describe('notifyOwner', () => {
  it('sends in the background when there is a key', async () => {
    const fetchFn = ok();
    const pending: Promise<unknown>[] = [];
    notifyOwner({
      apiKey: 'key',
      waitUntil: (p) => pending.push(p),
      notice: () => notice,
      fetchFn,
    });
    await Promise.all(pending);
    expect(pending).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('queues a notice Brevo refuses, for a retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const refused = vi.fn<typeof fetch>().mockResolvedValue(new Response('quota', { status: 402 }));
    const send = vi.fn<EmailRetry['send']>().mockResolvedValue(undefined);
    const pending: Promise<unknown>[] = [];
    notifyOwner({
      apiKey: 'k',
      waitUntil: (p) => pending.push(p),
      notice: () => notice,
      retry: { send },
      fetchFn: refused,
    });
    await Promise.all(pending);
    expect(send).toHaveBeenCalledOnce();
    expect(send.mock.calls[0]?.[0].email.subject).toBe('תגובה חדשה במקראות: דגש קל');
  });

  it('sends nothing without a key (branch previews)', () => {
    const fetchFn = ok();
    const waitUntil = vi.fn();
    notifyOwner({ apiKey: undefined, waitUntil, notice: () => notice, fetchFn });
    expect(waitUntil).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('never throws or rejects: a saved comment must not become an error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const refused = vi.fn<typeof fetch>().mockRejectedValue(new Error('network down'));
    const pending: Promise<unknown>[] = [];
    notifyOwner({
      apiKey: 'k',
      waitUntil: (p) => pending.push(p),
      notice: () => notice,
      fetchFn: refused,
    });
    await expect(Promise.all(pending)).resolves.toBeDefined();
    expect(() =>
      notifyOwner({ apiKey: 'k', waitUntil: broken, notice: () => notice }),
    ).not.toThrow();
    expect(console.error).toHaveBeenCalledTimes(2);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  MAX_ATTEMPTS,
  RETRY_DELAY_SECONDS,
  retryEmails,
  sendEmail,
  sendOrRetry,
  type BrevoEmail,
  type EmailRetry,
  type RetryMessage,
} from './email';

const email: BrevoEmail = {
  sender: { name: 'מקראות', email: 'admin@mikraot.net' },
  to: [{ email: 'admin@mikraot.net' }],
  subject: 'נושא',
  textContent: 'טקסט',
  htmlContent: '<p>טקסט</p>',
};
const ok = () => vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 201 }));
const refused = () =>
  vi.fn<typeof fetch>().mockResolvedValue(new Response('quota', { status: 402 }));
const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => undefined);

describe('sendEmail', () => {
  it('posts the email to Brevo with the key', async () => {
    const fetchFn = ok();
    await sendEmail('key', email, fetchFn);
    const [url, init] = fetchFn.mock.calls[0] ?? [];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(new Headers(init?.headers).get('api-key')).toBe('key');
  });

  it('fails loudly when Brevo refuses', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(new Response('no', { status: 401 }));
    await expect(sendEmail('bad', email, fetchFn)).rejects.toThrow('401');
  });
});

describe('sendOrRetry', () => {
  it('sends at once, without the queue, when Brevo accepts', async () => {
    const send = vi.fn<EmailRetry['send']>();
    await sendOrRetry({ apiKey: 'k', email, what: 'Test', retry: { send }, fetchFn: ok() });
    expect(send).not.toHaveBeenCalled();
  });

  it('queues a refused email for an hour later', async () => {
    quiet();
    const send = vi.fn<EmailRetry['send']>().mockResolvedValue(undefined);
    await sendOrRetry({ apiKey: 'k', email, what: 'Test', retry: { send }, fetchFn: refused() });
    expect(send).toHaveBeenCalledWith(
      { what: 'Test', email },
      { delaySeconds: RETRY_DELAY_SECONDS },
    );
  });

  it('keeps a shorter limit for news that goes stale', async () => {
    quiet();
    const send = vi.fn<EmailRetry['send']>().mockResolvedValue(undefined);
    await sendOrRetry({
      apiKey: 'k',
      email,
      what: 'Alert',
      retry: { send },
      maxAttempts: 3,
      fetchFn: refused(),
    });
    expect(send.mock.calls[0]?.[0].maxAttempts).toBe(3);
  });

  it('throws when the queue refuses too, so the caller logs it', async () => {
    quiet();
    const send = vi.fn<EmailRetry['send']>().mockRejectedValue(new Error('queue down'));
    await expect(
      sendOrRetry({ apiKey: 'k', email, what: 'Test', retry: { send }, fetchFn: refused() }),
    ).rejects.toThrow('queue down');
  });

  it('throws when it can neither send nor queue', async () => {
    await expect(
      sendOrRetry({ apiKey: 'k', email, what: 'Test', fetchFn: refused() }),
    ).rejects.toThrow('402');
  });
});

const message = (attempts: number, maxAttempts?: number) => {
  const body = { what: 'Test', email, ...(maxAttempts !== undefined && { maxAttempts }) };
  const m = { body, attempts, ack: vi.fn(), retry: vi.fn() };
  return m satisfies RetryMessage;
};

describe('retryEmails', () => {
  it('sends a waiting email and removes it from the queue', async () => {
    const m = message(1);
    const fetchFn = ok();
    await retryEmails([m], 'k', fetchFn);
    expect(fetchFn).toHaveBeenCalledOnce();
    expect(m.ack).toHaveBeenCalledOnce();
    expect(m.retry).not.toHaveBeenCalled();
  });

  it('puts one still refused back for another hour, and gives up after a day', async () => {
    quiet();
    const again = message(3);
    const last = message(MAX_ATTEMPTS);
    await retryEmails([again, last], 'k', refused());
    expect(again.retry).toHaveBeenCalledWith({ delaySeconds: RETRY_DELAY_SECONDS });
    expect(again.ack).not.toHaveBeenCalled();
    expect(last.ack).toHaveBeenCalledOnce();
    expect(last.retry).not.toHaveBeenCalled();
  });

  it('gives up on an alert after its own shorter limit', async () => {
    quiet();
    const stale = message(3, 3);
    await retryEmails([stale], 'k', refused());
    expect(stale.ack).toHaveBeenCalledOnce();
  });

  it('drops waiting emails, logged, when there is no key', async () => {
    quiet();
    const m = message(1);
    await retryEmails([m], undefined, ok());
    expect(m.ack).toHaveBeenCalledOnce();
    expect(console.error).toHaveBeenCalled();
  });
});

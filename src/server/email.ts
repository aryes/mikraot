/**
 * Sending email through Brevo's transactional email API
 * (https://developers.brevo.com/reference/sendtransacemail): a plain fetch, since Brevo's npm SDK
 * targets Node servers and one documented POST needs no library.
 *
 * Emails Brevo refused (its free 300 a day used up, or Brevo down) are tried again later instead
 * of being lost: they wait in a Cloudflare Queue (`EMAIL_RETRY`, wrangler.jsonc; free plan:
 * 10,000 operations a day, messages kept 24 hours) and the Worker's `queue` handler
 * (src/worker.ts) sends them again every hour. Emails go out at once as before; only a refused
 * one enters the queue, so normal sends cost no queue operations. Used for the owner's comment
 * notices, reply notices and error alerts. Not for newsletter confirmations: the visitor is
 * waiting for the answer.
 */

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

export interface BrevoEmail {
  sender: { name: string; email: string };
  to: { email: string }[];
  replyTo?: { email: string; name: string };
  subject: string;
  htmlContent: string;
  textContent: string;
  /** Extra headers, e.g. List-Unsubscribe (Brevo passes them through). */
  headers?: Record<string, string>;
}

/** Sends one email through Brevo; throws if Brevo refuses it. */
export async function sendEmail(
  apiKey: string,
  email: BrevoEmail,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchFn(BREVO_SEND_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(email),
  });
  if (!res.ok) throw new Error(`Brevo send failed: ${res.status} ${await res.text()}`);
}

/** A queued email, what it is (for the logs), and how many tries it gets. */
export interface QueuedEmail {
  what: string;
  email: BrevoEmail;
  /** Fewer than MAX_ATTEMPTS for news that goes stale (alerts). */
  maxAttempts?: number;
}

/** The part of the queue binding the senders use. */
export interface EmailRetry {
  send(message: QueuedEmail, options: { delaySeconds: number }): Promise<void>;
}

/** The part of a queue batch's message the retry handler uses. */
export interface RetryMessage {
  body: QueuedEmail;
  /** 1 on the first delivery from the queue. */
  attempts: number;
  ack(): void;
  retry(options: { delaySeconds: number }): void;
}

export const RETRY_DELAY_SECONDS = 60 * 60;
/**
 * Hourly within the queue's 24 hours (the first try an hour after the refusal, the last at 22
 * hours, leaving room for a late delivery); Brevo's daily quota renews within that time.
 * wrangler.jsonc's `max_retries` allows more, so this is the limit.
 */
export const MAX_ATTEMPTS = 22;

/**
 * Sends an email; if Brevo refuses it, queues it for a retry in an hour. Throws only if it could
 * be neither sent nor queued (or there is no queue: previews, tests).
 */
export async function sendOrRetry(options: {
  apiKey: string;
  email: BrevoEmail;
  what: string;
  retry?: EmailRetry | undefined;
  maxAttempts?: number;
  fetchFn?: typeof fetch | undefined;
}): Promise<void> {
  const { apiKey, email, what, retry, maxAttempts, fetchFn } = options;
  try {
    await sendEmail(apiKey, email, fetchFn);
  } catch (error) {
    if (!retry) throw error;
    console.error(`${what}: not sent, tried again in an hour:`, error);
    await retry.send(
      { what, email, ...(maxAttempts !== undefined && { maxAttempts }) },
      { delaySeconds: RETRY_DELAY_SECONDS },
    );
  }
}

/**
 * The queue handler: sends each waiting email again; one still refused waits another hour. An
 * email Brevo accepted but answered with an error, or a Worker stopped between sending and
 * `ack`, is sent twice: rare, and better than lost.
 */
export async function retryEmails(
  messages: readonly RetryMessage[],
  apiKey: string | undefined,
  fetchFn?: typeof fetch,
): Promise<void> {
  for (const message of messages) {
    const { what, email, maxAttempts = MAX_ATTEMPTS } = message.body;
    if (!apiKey) {
      console.error(`${what}: dropped, no Brevo key`);
      message.ack();
      continue;
    }
    try {
      // One at a time: a handful of emails at most, and Brevo is spared a burst.
      // oxlint-disable-next-line no-await-in-loop
      await sendEmail(apiKey, email, fetchFn);
      message.ack();
    } catch (error) {
      if (message.attempts >= Math.min(maxAttempts, MAX_ATTEMPTS)) {
        console.error(`${what}: given up after ${message.attempts} tries:`, error);
        message.ack();
      } else {
        console.error(`${what}: try ${message.attempts} failed, again in an hour:`, error);
        message.retry({ delaySeconds: RETRY_DELAY_SECONDS });
      }
    }
  }
}

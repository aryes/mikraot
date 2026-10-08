/**
 * Emails the site owner when something fails on the server: a request that ended in a server
 * error, or the daily backup. Cloudflare's own error-rate alerts need the Enterprise plan; the
 * failing code knows at once, so it reports itself. Sent through Brevo like comment notices
 * (src/server/notify.ts).
 *
 * At most one email per kind of failure per hour: an outage can fail every request, and Brevo's
 * free plan sends 300 emails a day. The details stay in the Worker logs.
 */
import { OWNER_EMAIL, sendEmail } from './notify';

/** The part of a KV namespace binding the throttle uses. */
export interface AlertStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options: { expirationTtl: number }): Promise<void>;
}

export type AlertKind = 'request' | 'backup';

const TITLES: Record<AlertKind, string> = {
  request: 'בקשה לאתר נכשלה',
  backup: 'הגיבוי היומי נכשל',
};

/** One email per kind per hour. */
export const ALERT_INTERVAL_SECONDS = 60 * 60;

const LOGS = 'Cloudflare → Workers → mikraot → Observability → Logs';

/**
 * Reports a failure. Never throws: it runs after the failure is already handled (in `waitUntil`),
 * and an alert that fails must not cause another. Without a key (branch previews, local runs)
 * nothing is sent.
 */
export async function alertOwner(options: {
  apiKey: string | undefined;
  store: AlertStore;
  kind: AlertKind;
  /** What failed, for the email: a path and status, or an error message. */
  detail: string;
  now: Date;
  fetchFn?: typeof fetch;
}): Promise<void> {
  const { apiKey, store, kind, detail, now, fetchFn } = options;
  if (!apiKey) return;
  try {
    const key = `alert/${kind}`;
    if (await store.get(key)) return;
    await store.put(key, now.toISOString(), { expirationTtl: ALERT_INTERVAL_SECONDS });
    const title = TITLES[kind];
    const text = `${title} (${now.toISOString()}):\n${detail}\n\nהפרטים ביומן: ${LOGS}\nהודעות נוספות מאותו סוג לא יישלחו בשעה הקרובה.`;
    await sendEmail(
      apiKey,
      {
        sender: { name: 'מקראות', email: OWNER_EMAIL },
        to: [{ email: OWNER_EMAIL }],
        subject: `תקלה במקראות: ${title}`,
        textContent: text,
        htmlContent: `<div dir="rtl" style="font-family: sans-serif; white-space: pre-wrap">${text
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')}</div>`,
      },
      fetchFn,
    );
  } catch (error) {
    console.error('Alert email failed:', error);
  }
}

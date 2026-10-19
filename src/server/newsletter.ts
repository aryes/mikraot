/**
 * Newsletter sign-up through Brevo (the list, the emails and unsubscribing are Brevo's). Our own
 * form instead of Brevo's: Brevo's form editor has no right-to-left support, and its embed code
 * needs inline styles that the site's CSP blocks (decided with Arye, 2026-10-12).
 *
 * 1. The footer form posts here; Brevo's double opt-in API sends the confirmation email
 *    (template CONFIRM_TEMPLATE_ID, made through the API) and adds the address to the list only
 *    once its link is clicked: https://developers.brevo.com/reference/create-doi-contact
 * 2. Brevo then calls our webhook (event listAddition, src/pages/api/newsletter-webhook.ts),
 *    which sends the welcome email and tells the owner.
 * 3. The welcome email's unsubscribe link (src/pages/newsletter/unsubscribe.astro, and mail apps'
 *    one-click unsubscribe in src/worker.ts) takes the address off the list. Newsletters sent
 *    from Brevo carry Brevo's own unsubscribe link.
 */
import { sendEmail, type BrevoEmail } from './email';
import { escapeHtml, OWNER_EMAIL } from './notify';
import { readToken, signToken } from './signing';

const BREVO_DOI_URL = 'https://api.brevo.com/v3/contacts/doubleOptinConfirmation';
/** Brevo list "ניוזלטר מקראות". */
export const NEWSLETTER_LIST_ID = 4;
const BREVO_LIST_URL = `https://api.brevo.com/v3/contacts/lists/${NEWSLETTER_LIST_ID}`;
/** The welcome email's unsubscribe page (src/pages/newsletter/unsubscribe.astro). */
export const UNSUBSCRIBE_PATH = '/newsletter/unsubscribe/';
/** Brevo template "מקראות – אישור הרשמה (עברית)" (a double opt-in template: tag "optin"). */
export const CONFIRM_TEMPLATE_ID = 5;
/** Where the confirmation link leads (src/pages/newsletter/confirmed.astro). */
export const CONFIRMED_PATH = '/newsletter/confirmed/';
export const MAX_BODY_BYTES = 4_000;
const SENDER = { name: 'מקראות', email: OWNER_EMAIL };

/** Addresses the live site refused too (WordPress' Email Subscribers setting): sign-up spam. */
const BLOCKED_DOMAINS = ['mail.ru'];

export interface Signup {
  email: string;
  /** Optional; stored in Brevo as FIRSTNAME. */
  name: string;
}

const text = (body: unknown, key: string) => {
  const value = body && typeof body === 'object' ? Reflect.get(body, key) : undefined;
  return typeof value === 'string' ? value.trim() : '';
};

export function parseSignup(body: unknown): Signup | { error: string } {
  const email = text(body, 'email').toLowerCase();
  const name = text(body, 'name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: 'Invalid email' };
  }
  if (name.length > 100) return { error: 'Name too long' };
  return { email, name };
}

export const isBlocked = (email: string) => {
  const domain = email.slice(email.lastIndexOf('@') + 1);
  return BLOCKED_DOMAINS.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
};

/**
 * Asks Brevo to send the confirmation email. Throws if Brevo doesn't (down, its daily quota used
 * up, or refusing the address): the visitor is told nothing was sent and what to do, and the Worker
 * emails Arye (a server error; src/worker.ts). One answer for every failure (Arye, 2026-10-19):
 * Brevo's error codes don't reliably tell a refused address from a setup or quota problem.
 */
export async function requestConfirmation(
  apiKey: string,
  signup: Signup,
  origin: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchFn(BREVO_DOI_URL, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      email: signup.email,
      ...(signup.name && { attributes: { FIRSTNAME: signup.name } }),
      includeListIds: [NEWSLETTER_LIST_ID],
      templateId: CONFIRM_TEMPLATE_ID,
      redirectionUrl: new URL(CONFIRMED_PATH, origin).href,
    }),
  });
  if (!res.ok) throw new Error(`Brevo double opt-in failed: ${res.status} ${await res.text()}`);
}

/**
 * The addresses a Brevo webhook call reports as added to the newsletter list (one event, or a
 * batch of them). https://developers.brevo.com/docs/marketing-webhooks
 */
export function addedToList(body: unknown): string[] {
  const events = Array.isArray(body) ? body : [body];
  return events.flatMap((event: unknown) => {
    if (!event || typeof event !== 'object') return [];
    const lists: unknown = Reflect.get(event, 'list_id');
    const ids = (Array.isArray(lists) ? lists : [lists]).map(Number);
    const email = text(event, 'email').toLowerCase();
    return text(event, 'event') === 'list_addition' && ids.includes(NEWSLETTER_LIST_ID) && email
      ? [email]
      : [];
  });
}

export function welcomeEmail(to: string, siteUrl: string, unsubscribe: string): BrevoEmail {
  const link = escapeHtml(siteUrl);
  return {
    sender: SENDER,
    to: [{ email: to }],
    subject: 'ברוכים הבאים לעדכונים של מקראות',
    textContent: `ההרשמה אושרה, תודה!\n\nמעכשיו נשלח אליכם מדי פעם אימייל קצר על מה שחדש באתר: שיעורים, קריאות מוקלטות ועדכונים. בכל אימייל עדכונים יש קישור לביטול ההרשמה.\n\n${siteUrl}\n\nלביטול ההרשמה: ${unsubscribe}`,
    htmlContent: `<div dir="rtl" style="font-family: Arial, Helvetica, sans-serif; line-height: 1.7; text-align: right">
<p style="font-size: 20px; font-weight: bold; color: #3e5a24">ההרשמה אושרה, תודה!</p>
<p>מעכשיו נשלח אליכם מדי פעם אימייל קצר על מה שחדש באתר: שיעורים, קריאות מוקלטות ועדכונים. בכל אימייל עדכונים יש קישור לביטול ההרשמה.</p>
<p><a href="${link}" style="color: #5b763e">למקראות</a></p>
<p style="color: #666; font-size: 0.9em"><a href="${escapeHtml(unsubscribe)}">לביטול ההרשמה</a></p>
</div>`,
    // One-click unsubscribe from the mail app (RFC 8058): a POST to the same page (src/worker.ts).
    headers: {
      'List-Unsubscribe': `<${unsubscribe}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

export function subscriberNotice(subscriber: string): BrevoEmail {
  return {
    sender: SENDER,
    to: [{ email: OWNER_EMAIL }],
    subject: 'הרשמה חדשה לעדכונים של מקראות',
    textContent: `הרשמה חדשה לעדכונים: ${subscriber}`,
    htmlContent: `<div dir="rtl" style="font-family: sans-serif"><p>הרשמה חדשה לעדכונים: ${escapeHtml(subscriber)}</p></div>`,
  };
}

/** The welcome email and the owner's notice for one new subscriber. */
export async function welcome(
  options: {
    apiKey: string;
    secret: string;
    subscriber: string;
    /** The site's home page, linked in the email. */
    siteUrl: string;
    /** The site's address for the unsubscribe link. */
    origin: string;
  },
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const { apiKey, secret, subscriber, siteUrl, origin } = options;
  const token = await unsubscribeToken(secret, subscriber);
  const unsubscribe = new URL(`${UNSUBSCRIBE_PATH}?token=${token}`, origin).href;
  await sendEmail(apiKey, welcomeEmail(subscriber, siteUrl, unsubscribe), fetchFn);
  await sendEmail(apiKey, subscriberNotice(subscriber), fetchFn);
}

// The webhook's secret signs these links too; the purpose keeps the two uses apart.
const PURPOSE = 'newsletter-unsubscribe';

/**
 * The unsubscribe token for an address (src/server/signing.ts): no list of tokens needs keeping,
 * and no one can unsubscribe an address they didn't receive a link for.
 */
export const unsubscribeToken = (secret: string, email: string): Promise<string> =>
  signToken(secret, PURPOSE, email);

/** The address a token was made for, or null if the token isn't one of ours. */
export const emailFromToken = (secret: string, token: string): Promise<string | null> =>
  readToken(secret, PURPOSE, token);

/** Removes an address from the newsletter list; one that is already gone counts as removed. */
export async function removeFromList(
  apiKey: string,
  email: string,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchFn(`${BREVO_LIST_URL}/contacts/remove`, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ emails: [email] }),
  });
  if (res.ok) return;
  const detail = await res.text();
  // Brevo answers 400 for an address no longer on the list, or no longer a contact at all.
  if (res.status === 400 && /already removed|does not exist/i.test(detail)) return;
  throw new Error(`Brevo list removal failed: ${res.status} ${detail}`);
}

const digest = async (value: string) =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));

/** Compares secrets without leaking, through timing, how much of a guess was right. */
export async function sameSecret(given: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(given), digest(expected)]);
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0 && expected !== '';
}

/**
 * Unsubscribes the address a token was made for (the unsubscribe page, and one-click from a mail
 * app). False for a token that isn't ours. Without an API key (previews, local runs) nothing is
 * removed.
 */
export async function unsubscribeNewsletter(
  options: { apiKey: string | undefined; secret: string | undefined; token: string },
  fetchFn: typeof fetch = fetch,
): Promise<boolean> {
  const email = await emailFromToken(options.secret ?? '', options.token);
  if (!email) return false;
  if (options.apiKey) await removeFromList(options.apiKey, email, fetchFn);
  else console.error('Newsletter unsubscribe: no BREVO_API_KEY, nothing removed');
  return true;
}

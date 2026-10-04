/**
 * Email to the site owner about each new comment (as WordPress did), sent through Brevo's
 * transactional email API: https://developers.brevo.com/reference/sendtransacemail
 * A plain fetch: Brevo's npm SDK targets Node servers, and one documented POST needs no library.
 */

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';
/** The site's public address: sends the notices (a Brevo-verified sender) and receives them. */
export const OWNER_EMAIL = 'admin@mikraot.net';
const SENDER = { name: 'מקראות', email: OWNER_EMAIL };

export interface CommentNotice {
  commentId: number;
  pageTitle: string;
  /** Absolute URL of the page the comment is on. */
  pageUrl: string;
  author: string;
  /** The commenter's email, if given: replies to the notice go to them. */
  email: string | null;
  content: string;
}

export interface BrevoEmail {
  sender: { name: string; email: string };
  to: { email: string }[];
  replyTo?: { email: string; name: string };
  subject: string;
  htmlContent: string;
  textContent: string;
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  );

export function commentEmail(notice: CommentNotice, to: string): BrevoEmail {
  const link = `${notice.pageUrl}#comment-${notice.commentId}`;
  const from = notice.email ? `${notice.author} (${notice.email})` : notice.author;
  return {
    sender: SENDER,
    to: [{ email: to }],
    ...(notice.email && { replyTo: { email: notice.email, name: notice.author } }),
    subject: `תגובה חדשה במקראות: ${notice.pageTitle}`,
    textContent: `תגובה חדשה מאת ${from} בעמוד "${notice.pageTitle}":\n\n${notice.content}\n\n${link}`,
    htmlContent: `<div dir="rtl" style="font-family: sans-serif">
<p>תגובה חדשה מאת <strong>${escapeHtml(from)}</strong> בעמוד <a href="${escapeHtml(link)}">${escapeHtml(notice.pageTitle)}</a>:</p>
<blockquote style="white-space: pre-wrap; border-right: 3px solid #ccc; margin: 0; padding-right: 1em">${escapeHtml(notice.content)}</blockquote>
<p><a href="${escapeHtml(link)}">לתגובה באתר</a></p>
</div>`,
  };
}

const logFailure = (error: unknown) => {
  console.error('Comment notification failed:', error);
};

/**
 * Tells the owner about a saved comment, in the background (`waitUntil`: the Worker finishes the
 * send after responding). Never throws: the comment is already saved, so a failure here must not
 * turn the response into an error that invites a duplicate post. Without a key (branch previews)
 * nothing is sent. The notice is built lazily so that errors building it are caught here too.
 */
export function notifyOwner(options: {
  apiKey: string | undefined;
  waitUntil: (promise: Promise<unknown>) => void;
  notice: () => CommentNotice;
  fetchFn?: typeof fetch;
}): void {
  const { apiKey, waitUntil, notice, fetchFn } = options;
  if (!apiKey) return;
  try {
    waitUntil(sendEmail(apiKey, commentEmail(notice(), OWNER_EMAIL), fetchFn).catch(logFailure));
  } catch (error) {
    logFailure(error);
  }
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

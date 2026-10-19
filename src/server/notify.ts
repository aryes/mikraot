/**
 * Email to the site owner about each new comment (as WordPress did), sent through Brevo
 * (src/server/email.ts).
 */
import { sendOrRetry, type BrevoEmail, type EmailRetry } from './email';

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
  /** The comment management link (src/server/comment-manage.ts); absent without its secret. */
  manageUrl?: string;
}

export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  );

const MANAGE_LABEL = 'ניהול התגובה';
const MANAGE_LINE = 'הסתרה או החזרה של התגובה באתר';

export function commentEmail(notice: CommentNotice, to: string): BrevoEmail {
  const link = `${notice.pageUrl}#comment-${notice.commentId}`;
  const from = notice.email ? `${notice.author} (${notice.email})` : notice.author;
  const manage = notice.manageUrl;
  return {
    sender: SENDER,
    to: [{ email: to }],
    ...(notice.email && { replyTo: { email: notice.email, name: notice.author } }),
    subject: `תגובה חדשה במקראות: ${notice.pageTitle}`,
    textContent:
      `תגובה חדשה מאת ${from} בעמוד "${notice.pageTitle}":\n\n${notice.content}\n\n${link}` +
      (manage ? `\n\n${MANAGE_LABEL} (${MANAGE_LINE}):\n${manage}` : ''),
    htmlContent: `<div dir="rtl" style="font-family: sans-serif">
<p>תגובה חדשה מאת <strong>${escapeHtml(from)}</strong> בעמוד <a href="${escapeHtml(link)}">${escapeHtml(notice.pageTitle)}</a>:</p>
<blockquote style="white-space: pre-wrap; border-right: 3px solid #ccc; margin: 0; padding-right: 1em">${escapeHtml(notice.content)}</blockquote>
<p><a href="${escapeHtml(link)}">לתגובה באתר</a></p>${manage ? `\n<p><a href="${escapeHtml(manage)}">${MANAGE_LABEL}</a>: ${MANAGE_LINE}</p>` : ''}
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
 * nothing is sent; one Brevo refuses is tried again later (`retry`). The notice is built lazily,
 * in the background (it may sign a link), so that errors building it are caught here too.
 */
export function notifyOwner(options: {
  apiKey: string | undefined;
  waitUntil: (promise: Promise<unknown>) => void;
  notice: () => CommentNotice | Promise<CommentNotice>;
  retry?: EmailRetry | undefined;
  fetchFn?: typeof fetch;
}): void {
  const { apiKey, waitUntil, notice, retry, fetchFn } = options;
  if (!apiKey) return;
  try {
    waitUntil(
      Promise.resolve()
        .then(notice)
        .then((built) =>
          sendOrRetry({
            apiKey,
            email: commentEmail(built, OWNER_EMAIL),
            what: 'Comment notification',
            retry,
            fetchFn,
          }),
        )
        .catch(logFailure),
    );
  } catch (error) {
    logFailure(error); // a waitUntil that throws
  }
}

/**
 * Email to a commenter when someone replies to their comment, if they ticked "email me when
 * someone replies" (src/server/comments.ts). Sent through Brevo, like the owner's notices.
 *
 * It names who replied and links to the reply, without quoting it: anyone can reply, and quoting
 * would let a stranger have any text emailed from the site's address.
 */
import { escapeHtml, OWNER_EMAIL, sendEmail, type BrevoEmail } from './notify';
import type { ReplyRecipient } from './comments';

export interface ReplyNotice {
  recipient: ReplyRecipient;
  replyId: number;
  replierName: string;
  pageTitle: string;
  /** Absolute URL of the page the comments are on. */
  pageUrl: string;
  /** The site's origin, for the unsubscribe link. */
  origin: string;
}

/** The unsubscribe page for a token (it asks for one click to confirm). */
export const unsubscribeUrl = (origin: string, token: string) =>
  `${origin}/unsubscribe/?token=${encodeURIComponent(token)}`;

export function replyEmail(notice: ReplyNotice): BrevoEmail {
  const link = `${notice.pageUrl}#comment-${notice.replyId}`;
  const unsubscribe = unsubscribeUrl(notice.origin, notice.recipient.unsubscribeToken);
  return {
    sender: { name: 'מקראות', email: OWNER_EMAIL },
    to: [{ email: notice.recipient.email }],
    subject: `תשובה לתגובתך במקראות: ${notice.pageTitle}`,
    textContent:
      `שלום ${notice.recipient.name},\n\nהתקבלה תשובה מאת ${notice.replierName} לתגובתך בעמוד "${notice.pageTitle}".\n\n` +
      `לקריאת התשובה: ${link}\n\n` +
      `קיבלת את ההודעה כי ביקשת אימייל כשמשיבים לתגובה שלך. להפסקת ההודעות: ${unsubscribe}`,
    htmlContent: `<div dir="rtl" style="font-family: sans-serif">
<p>שלום ${escapeHtml(notice.recipient.name)},</p>
<p>התקבלה תשובה מאת <strong>${escapeHtml(notice.replierName)}</strong> לתגובתך בעמוד <a href="${escapeHtml(link)}">${escapeHtml(notice.pageTitle)}</a>.</p>
<p><a href="${escapeHtml(link)}">לקריאת התשובה באתר</a></p>
<p style="color: #666; font-size: 0.9em">קיבלת את ההודעה כי ביקשת אימייל כשמשיבים לתגובה שלך. <a href="${escapeHtml(unsubscribe)}">להפסקת ההודעות</a></p>
</div>`,
    // One-click unsubscribe from the mail app (RFC 8058): a POST to the same page.
    headers: {
      'List-Unsubscribe': `<${unsubscribe}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  };
}

/**
 * Sends the reply notice. Never rejects: the reply is already saved, and the caller runs this in
 * the background. Without a key (branch previews, local runs) nothing is sent; nobody is told
 * about their own reply.
 */
export async function notifyReplyAuthor(options: {
  apiKey: string | undefined;
  notice: ReplyNotice;
  replierEmail: string | null;
  fetchFn?: typeof fetch;
}): Promise<void> {
  const { apiKey, notice, replierEmail, fetchFn } = options;
  if (!apiKey) return;
  if (replierEmail && replierEmail.toLowerCase() === notice.recipient.email.toLowerCase()) return;
  try {
    await sendEmail(apiKey, replyEmail(notice), fetchFn);
  } catch (error) {
    console.error('Reply notification failed:', error);
  }
}

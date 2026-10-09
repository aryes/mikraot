import React, { useEffect, useId, useRef, useState } from 'react';
import { CommentError, fetchComments, postComment, type CommentItem } from '../lib/api';
import { buildThreads } from '../lib/comment-threads';
import { loadCommenter, rememberCommenter } from '../lib/commenter';
import { isReservedName } from '../lib/reserved-names';
import { Turnstile } from './Turnstile';
import { MessageSquare, Reply, Send, CheckCircle2, User, ShieldCheck, X } from 'lucide-react';

interface CommentsProps {
  /** Key new comments are stored under: the page's decoded path, e.g. `טעמים/נוסח-אשכנז`. */
  pageKey: string;
  /** Every key this page's existing comments may be stored under (WordPress slugs vary). */
  lookupKeys: string[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('he-IL', { year: 'numeric', month: 'short', day: 'numeric' });
}

export const Comments: React.FC<CommentsProps> = ({ pageKey, lookupKeys }) => {
  // Comments are stored together with the query key they were loaded for, so a response
  // for a previous page can never be shown on the current one.
  const [loaded, setLoaded] = useState<{ key: string; comments: CommentItem[] } | null>(null);
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // Ids that tie each label to its field (screen readers announce the label; clicking it focuses
  // the field).
  const fieldId = `comment-form${useId()}`;
  const [turnstileToken, setTurnstileToken] = useState('');
  // Changing the key remounts the Turnstile widget for a fresh token (each works once).
  const [turnstileKey, setTurnstileKey] = useState(0);
  // The human check loads when the visitor starts on the form, not with the page: it is about
  // 150 KB from Cloudflare, and readers who don't comment needn't contact it at all.
  const [checkStarted, setCheckStarted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [remember, setRemember] = useState(false);
  /** "Email me when someone replies": offered once an email is filled in. */
  const [notifyReplies, setNotifyReplies] = useState(false);
  /** The comment being answered, if the visitor clicked "reply". */
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const slugKey = lookupKeys.join(',');
  const loading = loaded?.key !== slugKey;
  const comments = loaded?.key === slugKey ? loaded.comments : [];

  // Name and email saved in this browser by an earlier comment ("remember me"). Read after
  // hydration: the server-rendered form has no access to the browser's storage.
  useEffect(() => {
    const timer = setTimeout(() => {
      const saved = loadCommenter();
      if (!saved) return;
      setAuthorName(saved.name);
      setAuthorEmail(saved.email);
      setRemember(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let current = true;
    void fetchComments(slugKey.split(',')).then((data) => {
      if (current) setLoaded({ key: slugKey, comments: data });
    });
    return () => {
      current = false;
    };
  }, [slugKey]);

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!authorName.trim() || !content.trim() || !turnstileToken || isReservedName(authorName)) {
      return;
    }

    const website = new FormData(e.currentTarget).get('website');
    setSubmitting(true);
    setErrorMessage('');

    try {
      const saved = await postComment({
        page_slug: pageKey,
        author_name: authorName.trim(),
        author_email: authorEmail.trim() || undefined,
        content: content.trim(),
        website: typeof website === 'string' ? website : '',
        turnstile_token: turnstileToken,
        parent_id: replyTo?.id,
        notify_replies: notifyReplies && authorEmail.trim() !== '',
      });

      if (saved.id) {
        setLoaded((prev) => prev && { ...prev, comments: [...prev.comments, saved] });
      }

      rememberCommenter({ name: authorName.trim(), email: authorEmail.trim() }, remember);
      setContent('');
      setReplyTo(null);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Failed to submit comment:', err);
      const status = err instanceof CommentError ? err.status : 0;
      setErrorMessage(
        status === 403
          ? 'בדיקת האבטחה נכשלה. אנא נסו שוב.'
          : status === 429
            ? 'נשלחו תגובות רבות מדי. אנא נסו שוב בעוד דקה.'
            : 'אירעה שגיאה בשליחת התגובה. אנא נסו שוב.',
      );
    } finally {
      setSubmitting(false);
      setTurnstileToken('');
      setTurnstileKey((key) => key + 1);
    }
  };

  const startReply = (comment: CommentItem) => {
    setReplyTo(comment);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    contentRef.current?.focus({ preventScroll: true });
  };

  const nameReserved = isReservedName(authorName);
  const threads = buildThreads(comments);
  // Replies are indented under the comment they answer; deeper levels stop indenting on phones.
  const renderComment = (comment: CommentItem, depth: number): React.ReactNode => {
    const replies = threads.replies(comment);
    return (
      <div key={comment.id}>
        <div
          // WordPress comment links (#comment-426) keep working.
          id={`comment-${comment.id}`}
          className={`rounded-xl border p-4 transition-all sm:p-5 ${
            comment.is_admin_reply
              ? `border-emerald-200/80 bg-emerald-50/50 ${comment.parent_id === null ? 'mr-4 sm:mr-8' : ''}`
              : 'border-slate-200/80 bg-slate-50/80'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  comment.is_admin_reply
                    ? 'bg-brand-strong text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {comment.is_admin_reply ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
              </div>
              <span className="text-sm font-bold text-slate-800">{comment.author_name}</span>
              {comment.is_admin_reply ? (
                <span className="bg-brand/15 text-brand-deep rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  מנהל האתר
                </span>
              ) : null}
            </div>
            <time className="text-xs text-slate-600">{formatDate(comment.created_at)}</time>
          </div>
          <p className="pr-9 text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
            {comment.content}
          </p>
          <button
            type="button"
            onClick={() => startReply(comment)}
            className="text-brand-strong hover:text-brand-deep mt-2 mr-9 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold"
            aria-label={`השיבו ל${comment.author_name}`}
          >
            <Reply className="h-3.5 w-3.5" />
            השיבו
          </button>
        </div>
        {replies.length > 0 && (
          <div
            className={`mt-3 space-y-3 ${depth < 2 ? 'border-r-2 border-slate-200 pr-3 sm:pr-6' : ''}`}
          >
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mt-12 border-t border-slate-200 pt-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <MessageSquare className="text-brand-strong h-5 w-5" />
        <h2 className="font-hebrew text-xl font-bold text-slate-800">
          תגובות ושאלות {comments.length > 0 && `(${comments.length})`}
        </h2>
      </div>

      {/* Comment List */}
      <div className="mb-8 space-y-4">
        {loading ? (
          <div className="py-4 text-sm text-slate-600">טוען תגובות...</div>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-5 text-center text-sm text-slate-600">
            אין תגובות עדיין. היו הראשונים להגיב או לשאול שאלה!
          </div>
        ) : (
          threads.roots.map((comment) => renderComment(comment, 0))
        )}
      </div>

      {/* Add Comment Form */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-7">
        <h3 className="font-hebrew mb-4 text-base font-bold text-slate-800">הוספת תגובה או שאלה</h3>

        {submitted && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>התגובה נוספה בהצלחה!</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={(e) => void handleSubmit(e)}
          onFocus={() => setCheckStarted(true)}
          className="space-y-4"
        >
          {replyTo && (
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span>
                תגובה ל<strong>{replyTo.author_name}</strong>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-200"
                aria-label="ביטול התגובה לתגובה"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {/* Anti-spam: hidden from people (and screen readers); bots tend to fill it in. */}
          <div aria-hidden="true" className="sr-only">
            <label>
              אתר
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`${fieldId}-name`}
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                שם <span className="text-red-500">*</span>
              </label>
              <input
                id={`${fieldId}-name`}
                type="text"
                autoComplete="name"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="השם שלכם"
                aria-invalid={nameReserved}
                aria-describedby={nameReserved ? `${fieldId}-name-reserved` : undefined}
                className="focus:ring-brand-strong w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
              />
              {nameReserved && (
                <p id={`${fieldId}-name-reserved`} className="mt-1 text-xs text-red-700">
                  השם הזה שמור למנהל האתר. אנא בחרו שם אחר.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-email`}
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                אימייל <span className="font-normal text-slate-500">(לא יוצג באתר)</span>
              </label>
              <input
                id={`${fieldId}-email`}
                type="email"
                autoComplete="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="your@email.com"
                className="focus:ring-brand-strong w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`${fieldId}-content`}
              className="mb-1 block text-xs font-semibold text-slate-600"
            >
              תוכן התגובה <span className="text-red-500">*</span>
            </label>
            <textarea
              id={`${fieldId}-content`}
              ref={contentRef}
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="כתבו את תגובתכם או שאלתכם כאן..."
              className="focus:ring-brand-strong w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-brand-strong h-4 w-4"
            />
            שמרו את השם והאימייל שלי בדפדפן הזה לתגובה הבאה
          </label>

          {authorEmail.trim() !== '' && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={notifyReplies}
                onChange={(e) => setNotifyReplies(e.target.checked)}
                className="accent-brand-strong h-4 w-4"
              />
              שלחו לי אימייל כשמשיבים לתגובה שלי (אפשר להפסיק בכל עת)
            </label>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            {checkStarted ? (
              <Turnstile key={turnstileKey} onToken={setTurnstileToken} />
            ) : (
              <div className="min-h-[65px] w-[300px] max-w-full" /> // the widget's space, so nothing moves
            )}
            <button
              type="submit"
              disabled={
                submitting ||
                !authorName.trim() ||
                !content.trim() ||
                !turnstileToken ||
                nameReserved
              }
              className="bg-brand-strong hover:bg-brand-deep inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              <span>{submitting ? 'שולח...' : 'פרסום תגובה'}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

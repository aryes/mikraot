import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
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
  /**
   * The form stays closed behind a button until the visitor asks for it (or clicks "reply"):
   * open, it was bigger than the content of short pages (design review, 2026-10-12).
   */
  const [formOpen, setFormOpen] = useState(false);
  /** Set by a send with missing fields: each one then says what it needs. */
  const [attempted, setAttempted] = useState(false);
  /** A send before the human check finished: say so instead of failing silently. */
  const [checkPending, setCheckPending] = useState(false);
  /** The human check couldn't run (blocked script, Cloudflare error): say so. */
  const [checkFailed, setCheckFailed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  /** After a send the form closes: the cursor then goes back to its button. */
  const focusOpenButton = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  /** Where to put the cursor once the form has opened (it isn't in the page before). */
  const focusAfterOpen = useRef<'name' | 'content' | null>(null);

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

  // Once the form is in the page, move to it: the name field, or the text when replying.
  useEffect(() => {
    if (!formOpen || !focusAfterOpen.current) return;
    const target = focusAfterOpen.current === 'content' ? contentRef.current : nameRef.current;
    focusAfterOpen.current = null;
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
  }, [formOpen]);

  // A send that waited for the human check goes out as soon as the check is done.
  useEffect(() => {
    if (checkPending && turnstileToken) formRef.current?.requestSubmit();
  }, [checkPending, turnstileToken]);

  useEffect(() => {
    if (formOpen || !focusOpenButton.current) return;
    focusOpenButton.current = false;
    openButtonRef.current?.focus();
  }, [formOpen]);

  // Stable callbacks for the widget (a new function would re-render it).
  const handleToken = useCallback((token: string) => {
    setTurnstileToken(token);
    if (token) setCheckFailed(false);
  }, []);
  const handleCheckError = useCallback(() => {
    setCheckFailed(true);
    setCheckPending(false);
  }, []);

  const closeForm = () => {
    setFormOpen(false);
    setAttempted(false);
    setCheckPending(false);
    setReplyTo(null);
    focusOpenButton.current = true;
  };

  const openForm = (focus: 'name' | 'content') => {
    focusAfterOpen.current = focus;
    // The human check starts loading now, while the visitor writes.
    setCheckStarted(true);
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nameMissing = !authorName.trim() || isReservedName(authorName);
    const contentMissing = !content.trim();
    if (nameMissing || contentMissing) {
      setAttempted(true);
      setCheckPending(false);
      (nameMissing ? nameRef.current : contentRef.current)?.focus();
      return;
    }
    if (!turnstileToken) {
      setCheckPending(true);
      return;
    }
    setCheckPending(false);

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
      setAttempted(false);
      focusOpenButton.current = true;
      setFormOpen(false);
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
    if (!formOpen) {
      openForm('content');
      return;
    }
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    contentRef.current?.focus({ preventScroll: true });
  };

  const nameReserved = isReservedName(authorName);
  const nameError = nameReserved
    ? 'השם הזה שמור למנהל האתר. אנא בחרו שם אחר.'
    : attempted && !authorName.trim()
      ? 'נא לכתוב שם.'
      : '';
  const contentError = attempted && !content.trim() ? 'נא לכתוב את התגובה או השאלה.' : '';
  // Shown while a send waits for the human check (it goes out by itself when the check is done).
  const checkNotice = checkPending && !turnstileToken;
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
              ? `border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/40 ${comment.parent_id === null ? 'mr-4 sm:mr-8' : ''}`
              : 'border-slate-200/80 bg-slate-50/80 dark:border-slate-700/80 dark:bg-slate-800/80'
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  comment.is_admin_reply
                    ? 'bg-brand-strong text-white'
                    : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}
              >
                {comment.is_admin_reply ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
              </div>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {comment.author_name}
              </span>
              {comment.is_admin_reply ? (
                <span className="bg-brand/15 text-brand-deep dark:text-brand-light rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  מנהל האתר
                </span>
              ) : null}
            </div>
            <time className="text-xs text-slate-600 dark:text-slate-300">
              {formatDate(comment.created_at)}
            </time>
          </div>
          <p className="pr-9 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
            {comment.content}
          </p>
          <button
            type="button"
            onClick={() => startReply(comment)}
            className="text-brand-strong dark:text-brand hover:text-brand-deep dark:hover:text-brand-light mt-2 mr-9 inline-flex cursor-pointer items-center gap-1 text-xs font-semibold"
            aria-label={`השיבו ל${comment.author_name}`}
          >
            <Reply className="h-3.5 w-3.5" />
            השיבו
          </button>
        </div>
        {replies.length > 0 && (
          <div
            className={`mt-3 space-y-3 ${depth < 2 ? 'border-r-2 border-slate-200 pr-3 sm:pr-6 dark:border-slate-700' : ''}`}
          >
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="mt-12 border-t border-slate-200 pt-8 dark:border-slate-700">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <MessageSquare className="text-brand-strong dark:text-brand h-5 w-5" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
          תגובות ושאלות {comments.length > 0 && `(${comments.length})`}
        </h2>
      </div>

      {/* Comment List */}
      <div className="mb-8 space-y-4">
        {loading ? (
          <div className="py-4 text-sm text-slate-600 dark:text-slate-300">טוען תגובות...</div>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-5 text-center text-sm text-slate-600 dark:border-slate-700/60 dark:bg-slate-800 dark:text-slate-300">
            אין תגובות עדיין. היו הראשונים להגיב או לשאול שאלה!
          </div>
        ) : (
          threads.roots.map((comment) => renderComment(comment, 0))
        )}
      </div>

      {/* Live regions stay in the page and change their text, so screen readers announce it. */}
      <div role="status">
        {submitted && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>התגובה נוספה בהצלחה!</span>
          </div>
        )}
      </div>

      {/* Add Comment Form: closed behind a button until asked for */}
      {!formOpen ? (
        <button
          ref={openButtonRef}
          type="button"
          onClick={() => openForm('name')}
          className="bg-brand-strong hover:bg-brand-deep inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-all"
        >
          <MessageSquare className="h-4 w-4" />
          כתבו תגובה או שאלה
        </button>
      ) : (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-7 dark:border-slate-700/90 dark:bg-slate-900">
          <h3 className="mb-4 text-base font-bold text-slate-800 dark:text-slate-100">
            הוספת תגובה או שאלה
          </h3>

          <div role="alert">
            {errorMessage && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
                {errorMessage}
              </div>
            )}
          </div>

          <form
            ref={formRef}
            onSubmit={(e) => void handleSubmit(e)}
            // Missing fields are explained in the form itself, in Hebrew, rather than by the
            // browser's own bubbles.
            noValidate
            className="space-y-4"
          >
            {replyTo && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <span>
                  תגובה ל<strong>{replyTo.author_name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setReplyTo(null)}
                  className="cursor-pointer rounded p-1 text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700"
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
                  className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  שם <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  id={`${fieldId}-name`}
                  ref={nameRef}
                  type="text"
                  autoComplete="name"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="השם שלכם"
                  aria-invalid={nameError !== ''}
                  aria-describedby={nameError ? `${fieldId}-name-error` : undefined}
                  className="focus:ring-brand-strong dark:focus:ring-brand w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none aria-invalid:border-red-600 aria-invalid:focus:ring-red-600 dark:border-slate-600 dark:aria-invalid:border-red-400 dark:aria-invalid:focus:ring-red-400"
                />
                {nameError && (
                  <p
                    id={`${fieldId}-name-error`}
                    className="mt-1 text-xs text-red-700 dark:text-red-400"
                  >
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor={`${fieldId}-email`}
                  className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300"
                >
                  אימייל{' '}
                  <span className="font-normal text-slate-500 dark:text-slate-400">
                    (לא יוצג באתר)
                  </span>
                </label>
                <input
                  id={`${fieldId}-email`}
                  type="email"
                  autoComplete="email"
                  value={authorEmail}
                  onChange={(e) => setAuthorEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="focus:ring-brand-strong dark:focus:ring-brand w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none dark:border-slate-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={`${fieldId}-content`}
                className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                תוכן התגובה <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <textarea
                id={`${fieldId}-content`}
                ref={contentRef}
                required
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="כתבו את תגובתכם או שאלתכם כאן..."
                aria-invalid={contentError !== ''}
                aria-describedby={contentError ? `${fieldId}-content-error` : undefined}
                className="focus:ring-brand-strong dark:focus:ring-brand w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none aria-invalid:border-red-600 aria-invalid:focus:ring-red-600 dark:border-slate-600 dark:aria-invalid:border-red-400 dark:aria-invalid:focus:ring-red-400"
              />
              {contentError && (
                <p
                  id={`${fieldId}-content-error`}
                  className="mt-1 text-xs text-red-700 dark:text-red-400"
                >
                  {contentError}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 py-1 text-xs text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-brand-strong h-5 w-5 shrink-0"
              />
              שמרו את השם והאימייל שלי בדפדפן הזה לתגובה הבאה
            </label>

            {authorEmail.trim() !== '' && (
              <label className="flex items-center gap-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={notifyReplies}
                  onChange={(e) => setNotifyReplies(e.target.checked)}
                  className="accent-brand-strong h-5 w-5 shrink-0"
                />
                שלחו לי אימייל כשמשיבים לתגובה שלי (אפשר להפסיק בכל עת)
              </label>
            )}

            <div className="flex flex-wrap items-center justify-between gap-4">
              {checkStarted ? (
                <Turnstile key={turnstileKey} onToken={handleToken} onError={handleCheckError} />
              ) : (
                <div className="min-h-[65px] w-[300px] max-w-full" /> // the widget's space, so nothing moves
              )}
              <button
                type="submit"
                // Only while sending: otherwise a click with something missing says what it is.
                disabled={submitting}
                className="bg-brand-strong hover:bg-brand-deep inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-all disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span>{submitting ? 'שולח...' : 'פרסום תגובה'}</span>
              </button>
              <button
                type="button"
                onClick={closeForm}
                className="cursor-pointer rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                ביטול
              </button>
            </div>
            <p role="status" className="text-xs text-slate-600 empty:hidden dark:text-slate-300">
              {checkFailed
                ? 'בדיקת האבטחה לא נטענה. בדקו את החיבור, רעננו את הדף ונסו שוב.'
                : checkNotice
                  ? 'בדיקת האבטחה עוד רצה. התגובה תישלח מיד כשתסתיים.'
                  : ''}
            </p>
          </form>
        </div>
      )}
    </section>
  );
};

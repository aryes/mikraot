import React, { useState, useEffect } from 'react';
import { fetchComments, postComment, type CommentItem } from '../lib/api';
import { MessageSquare, Send, CheckCircle2, User, ShieldCheck } from 'lucide-react';

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
  const [errorMessage, setErrorMessage] = useState('');

  const slugKey = lookupKeys.join(',');
  const loading = loaded?.key !== slugKey;
  const comments = loaded?.key === slugKey ? loaded.comments : [];

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
    if (!authorName.trim() || !content.trim()) return;

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
      });

      if (saved.id) {
        setLoaded((prev) => prev && { ...prev, comments: [...prev.comments, saved] });
      }

      setContent('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Failed to submit comment:', err);
      setErrorMessage('אירעה שגיאה בשליחת התגובה. אנא נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12 border-t border-slate-200 pt-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <MessageSquare className="text-brand-strong h-5 w-5" />
        <h3 className="font-hebrew text-xl font-bold text-slate-800">
          תגובות ושאלות {comments.length > 0 && `(${comments.length})`}
        </h3>
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
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`rounded-xl border p-4 transition-all sm:p-5 ${
                comment.is_admin_reply
                  ? 'mr-4 border-emerald-200/80 bg-emerald-50/50 sm:mr-8'
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
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs sm:p-7">
        <h4 className="font-hebrew mb-4 text-base font-bold text-slate-800">הוספת תגובה או שאלה</h4>

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

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {/* Anti-spam: hidden from people (and screen readers); bots tend to fill it in. */}
          <div aria-hidden="true" className="sr-only">
            <label>
              אתר
              <input type="text" name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                שם <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="השם שלכם"
                className="focus:ring-brand-strong w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                אימייל <span className="font-normal text-slate-500">(לא יוצג באתר)</span>
              </label>
              <input
                type="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="your@email.com"
                className="focus:ring-brand-strong w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              תוכן התגובה <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="כתבו את תגובתכם או שאלתכם כאן..."
              className="focus:ring-brand-strong w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !authorName.trim() || !content.trim()}
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

import React, { useState, useEffect } from 'react';
import { fetchComments, postComment, type CommentItem } from '../lib/api';
import { MessageSquare, Send, CheckCircle2, User, ShieldCheck } from 'lucide-react';

interface CommentsProps {
  pageSlug: string;
  pageTitle?: string;
  rawSlug?: string;
  pageId?: number;
}

export const Comments: React.FC<CommentsProps> = ({ pageSlug, rawSlug, pageId }) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentHashRoute =
    typeof window !== 'undefined'
      ? window.location.hash.replace(/^#\/?/, '').replace(/\/+$/, '')
      : '';
  let decodedHash = '';
  try {
    decodedHash = decodeURIComponent(currentHashRoute);
  } catch {}

  // Collect candidate slug identifiers to query for comments
  const candidateSlugs = Array.from(
    new Set(
      [
        pageSlug,
        pageSlug?.toLowerCase(),
        rawSlug,
        rawSlug?.toLowerCase(),
        pageId ? String(pageId) : null,
        currentHashRoute,
        decodedHash,
        pageSlug ? `טעמים/${pageSlug}` : null,
        pageSlug === 'about' || rawSlug === 'about' ? 'about' : null,
      ].filter(Boolean) as string[],
    ),
  );

  const loadData = async (isCurrent: () => boolean) => {
    try {
      setLoading(true);
      const data = await fetchComments(candidateSlugs);
      if (isCurrent()) {
        setComments(data);
      }
    } catch (err) {
      if (isCurrent()) {
        console.error('[Comments] Failed to load comments from D1:', err);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    loadData(() => mounted);

    return () => {
      mounted = false;
    };
  }, [pageSlug, rawSlug, pageId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !content.trim()) return;

    setSubmitting(true);
    setErrorMessage('');

    try {
      const saved = await postComment({
        page_slug: pageSlug,
        author_name: authorName.trim(),
        author_email: authorEmail.trim() || undefined,
        content: content.trim(),
      });

      if (saved && saved.id) {
        setComments((prev) => [...prev, saved]);
      }

      setContent('');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err: any) {
      console.error('Failed to submit comment:', err);
      setErrorMessage('אירעה שגיאה בשליחת התגובה. אנא נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="mt-12 border-t border-slate-200 pt-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-[#8CB65F]" />
        <h3 className="font-hebrew text-xl font-bold text-slate-800">
          תגובות ושאלות {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* Comment List */}
      <div className="mb-8 space-y-4">
        {loading ? (
          <div className="py-4 text-sm text-slate-400">טוען תגובות...</div>
        ) : comments.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-5 text-center text-sm text-slate-500">
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
                        ? 'bg-[#8CB65F] text-white'
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
                  {comment.is_admin_reply && (
                    <span className="rounded-full bg-[#8CB65F]/15 px-2 py-0.5 text-[11px] font-semibold text-[#5e8238]">
                      מנהל האתר
                    </span>
                  )}
                </div>
                <time className="text-xs text-slate-400">{formatDate(comment.created_at)}</time>
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-[#8CB65F] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                אימייל <span className="font-normal text-slate-400">(לא יוצג באתר)</span>
              </label>
              <input
                type="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-[#8CB65F] focus:outline-none"
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
              className="w-full resize-y rounded-xl border border-slate-300 px-3.5 py-2 text-sm transition-all focus:border-transparent focus:ring-2 focus:ring-[#8CB65F] focus:outline-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !authorName.trim() || !content.trim()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#8CB65F] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:bg-[#7aa252] disabled:opacity-50"
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

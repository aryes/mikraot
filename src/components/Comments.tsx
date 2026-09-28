import React, { useState, useEffect } from 'react';
import { fetchComments, postComment, CommentItem } from '../lib/api';
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

  // Collect candidate slug identifiers to query for comments
  const candidateSlugs = Array.from(
    new Set([
      pageSlug,
      pageSlug?.toLowerCase(),
      rawSlug,
      rawSlug?.toLowerCase(),
      pageId ? String(pageId) : null,
      pageSlug === 'about' || rawSlug === 'about' ? 'about' : null,
    ].filter(Boolean) as string[])
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
        setComments(prev => [...prev, saved]);
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
    <section className="mt-12 pt-8 border-t border-slate-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="w-5 h-5 text-[#8CB65F]" />
        <h3 className="text-xl font-bold text-slate-800 font-hebrew">
          תגובות ושאלות {comments.length > 0 && `(${comments.length})`}
        </h3>
      </div>

      {/* Comment List */}
      <div className="space-y-4 mb-8">
        {loading ? (
          <div className="text-sm text-slate-400 py-4">טוען תגובות...</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200/60 rounded-xl p-5 text-center">
            אין תגובות עדיין. היו הראשונים להגיב או לשאול שאלה!
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-4 sm:p-5 rounded-xl border transition-all ${
                comment.is_admin_reply
                  ? 'bg-emerald-50/50 border-emerald-200/80 mr-4 sm:mr-8'
                  : 'bg-slate-50/80 border-slate-200/80'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    comment.is_admin_reply
                      ? 'bg-[#8CB65F] text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}>
                    {comment.is_admin_reply ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="font-bold text-sm text-slate-800">
                    {comment.author_name}
                  </span>
                  {comment.is_admin_reply && (
                    <span className="text-[11px] font-semibold bg-[#8CB65F]/15 text-[#5e8238] px-2 py-0.5 rounded-full">
                      מנהל האתר
                    </span>
                  )}
                </div>
                <time className="text-xs text-slate-400">
                  {formatDate(comment.created_at)}
                </time>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap pr-9">
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Form */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 shadow-xs">
        <h4 className="text-base font-bold text-slate-800 mb-4 font-hebrew">
          הוספת תגובה או שאלה
        </h4>

        {submitted && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>התגובה נוספה בהצלחה!</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                שם <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="השם שלכם"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CB65F] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                אימייל <span className="text-slate-400 font-normal">(לא יוצג באתר)</span>
              </label>
              <input
                type="email"
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CB65F] focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              תוכן התגובה <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="כתבו את תגובתכם או שאלתכם כאן..."
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8CB65F] focus:border-transparent transition-all resize-y"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !authorName.trim() || !content.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8CB65F] hover:bg-[#7aa252] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'שולח...' : 'פרסום תגובה'}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

import React, { useState, useMemo } from 'react';
import type { ContentItem } from '../types';
import { Search, X, BookOpen, ArrowLeft } from 'lucide-react';

interface SearchViewProps {
  items: ContentItem[];
  onSelect: (item: ContentItem) => void;
  onClose: () => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ items, onSelect, onClose }) => {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return items
      .filter((item) => {
        return (
          item.title.toLowerCase().includes(q) ||
          item.content.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q)
        );
      })
      .slice(0, 15);
  }, [items, query]);

  return (
    <div className="animate-fadeIn fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 backdrop-blur-xs sm:pt-20">
      <div className="animate-scaleUp w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-slate-100 p-4">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            autoFocus
            placeholder="חפש נושא, טעם, ניקוד, הלכה, או הקלטה..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-none bg-transparent text-right text-base font-medium text-slate-800 outline-hidden placeholder:text-slate-400"
          />
          <button
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-xs text-slate-400">
              הקלד מילת חיפוש (למשל: <em>אתנחתא</em>, <em>דגש קל</em>, <em>שווא נע</em>,{' '}
              <em>אשכנז</em>)
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              לא נמצאו תוצאות עבור "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((res) => (
                <button
                  key={res.id}
                  onClick={() => {
                    onSelect(res);
                    onClose();
                  }}
                  className="group flex w-full cursor-pointer items-center justify-between rounded-xl border border-transparent p-3 text-right transition-all hover:border-slate-100 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-[#8CB65F]">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 transition-colors group-hover:text-[#8CB65F]">
                        {res.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {res.type === 'page' ? 'עמוד' : res.type === 'lp_lesson' ? 'שיעור' : 'מאמר'}
                      </span>
                    </div>
                  </div>
                  <ArrowLeft
                    size={16}
                    className="text-slate-300 transition-transform group-hover:-translate-x-1 group-hover:text-[#8CB65F]"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

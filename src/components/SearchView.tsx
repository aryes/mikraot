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
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 sm:pt-20 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-scaleUp">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="text-slate-400" size={20} />
          <input
            type="text"
            autoFocus
            placeholder="חפש נושא, טעם, ניקוד, הלכה, או הקלטה..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-hidden text-slate-800 text-base font-medium placeholder:text-slate-400 text-right"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() === '' ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              הקלד מילת חיפוש (למשל: <em>אתנחתא</em>, <em>דגש קל</em>, <em>שווא נע</em>, <em>אשכנז</em>)
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
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
                  className="w-full text-right p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#8CB65F] flex items-center justify-center shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm group-hover:text-[#8CB65F] transition-colors">
                        {res.title}
                      </h4>
                      <span className="text-[11px] text-slate-400 capitalize">
                        {res.type === 'page' ? 'עמוד' : res.type === 'lp_lesson' ? 'שיעור' : 'מאמר'}
                      </span>
                    </div>
                  </div>
                  <ArrowLeft size={16} className="text-slate-300 group-hover:text-[#8CB65F] transition-transform group-hover:-translate-x-1" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import type { ContentItem } from '../types';
import { ContentParser } from '../utils/contentParser';
import { Comments } from './Comments';

interface PageViewProps {
  page: ContentItem;
  onNavigate: (route: string) => void;
}

export const PageView: React.FC<PageViewProps> = ({ page, onNavigate }) => {
  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium">
        <button onClick={() => onNavigate('')} className="hover:text-[#8CB65F] cursor-pointer">
          ראשי
        </button>
        <span>/</span>
        <span className="text-slate-800 font-semibold truncate max-w-xs">{page.title}</span>
      </nav>

      {/* Main Card Container matching Kahuna style */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-10 shadow-xs">
        {/* Title */}
        <header className="border-b border-slate-100 pb-6 mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#334155] tracking-tight leading-tight mb-2 font-hebrew">
            {page.title}
          </h1>
        </header>

        {/* Content */}
        <ContentParser content={page.content} onNavigate={onNavigate} />

        {/* Comments & Discussion */}
        <Comments
          pageSlug={page.slug}
          rawSlug={page.rawSlug}
          pageId={page.id}
          pageTitle={page.title}
        />
      </div>
    </article>
  );
};

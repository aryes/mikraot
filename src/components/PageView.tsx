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
    <article className="animate-fadeIn mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-xs font-medium text-slate-500">
        <button onClick={() => onNavigate('')} className="cursor-pointer hover:text-[#8CB65F]">
          ראשי
        </button>
        <span>/</span>
        <span className="max-w-xs truncate font-semibold text-slate-800">{page.title}</span>
      </nav>

      {/* Main Card Container matching Kahuna style */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-10">
        {/* Title */}
        <header className="mb-8 border-b border-slate-100 pb-6">
          <h1 className="font-hebrew mb-2 text-3xl leading-tight font-extrabold tracking-tight text-[#334155] sm:text-4xl">
            {page.title}
          </h1>
        </header>

        {/* Content */}
        <ContentParser key={page.id} content={page.content} onNavigate={onNavigate} />

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

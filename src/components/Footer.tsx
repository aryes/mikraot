import React from 'react';
import type { MenuItem } from '../types';
import { cleanUrlToRoute } from '../utils/menuHelper';
import { BookOpen, ArrowUp } from 'lucide-react';

interface FooterProps {
  siteTitle: string;
  copyright: string;
  menuItems: MenuItem[];
  onNavigate: (route: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ siteTitle, copyright, menuItems, onNavigate }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Top level menu links for footer
  const quickLinks = menuItems.filter((m) => m.parentId === 0).slice(0, 6);

  return (
    <footer className="mt-20 border-t border-slate-800 bg-[#1E2C35] text-[#BBBBBB]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand & Description */}
          <div className="space-y-3 md:col-span-2">
            <div className="flex items-center gap-2 text-white">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#8CB65F] font-bold text-white">
                <BookOpen size={18} />
              </div>
              <span className="text-xl font-bold">{siteTitle}</span>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-slate-400">
              אתר מוקדש ללימוד, שיפור והעמקת הקריאה בתנ"ך, כולל דיוקי הגיה, כללי דקדוק, טעמי המקרא
              וקריאות מוקלטות בנוסחים השונים.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-3 border-b border-slate-700 pb-2 text-sm font-bold text-white">
              ניווט מהיר
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('')}
                  className="cursor-pointer transition-colors hover:text-[#8CB65F]"
                >
                  דף הבית
                </button>
              </li>
              {quickLinks.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(cleanUrlToRoute(item.url))}
                    className="cursor-pointer transition-colors hover:text-[#8CB65F]"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => onNavigate('courses')}
                  className="cursor-pointer font-semibold text-[#8CB65F] transition-colors hover:text-[#8CB65F]"
                >
                  קורסים ומבחנים
                </button>
              </li>
            </ul>
          </div>

          {/* Back to Top */}
          <div className="flex flex-col items-start justify-between md:items-end">
            <button
              onClick={scrollToTop}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-slate-700"
            >
              <ArrowUp size={14} />
              לראש העמוד
            </button>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-800/80 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>{copyright}</p>
          <p className="flex items-center gap-1">לימוד מקראות וטעמי המקרא</p>
        </div>
      </div>
    </footer>
  );
};

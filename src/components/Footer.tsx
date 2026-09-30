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

export const Footer: React.FC<FooterProps> = ({
  siteTitle,
  copyright,
  menuItems,
  onNavigate,
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Top level menu links for footer
  const quickLinks = menuItems.filter(m => m.parentId === 0).slice(0, 6);

  return (
    <footer className="bg-[#1E2C35] text-[#BBBBBB] border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Description */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-lg bg-[#8CB65F] text-white flex items-center justify-center font-bold">
                <BookOpen size={18} />
              </div>
              <span className="text-xl font-bold">{siteTitle}</span>
            </div>
            <p className="text-sm text-slate-400 max-w-md leading-relaxed">
              אתר מוקדש ללימוד, שיפור והעמקת הקריאה בתנ"ך, כולל דיוקי הגיה, כללי דקדוק, טעמי המקרא וקריאות מוקלטות בנוסחים השונים.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-sm mb-3 border-b border-slate-700 pb-2">ניווט מהיר</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => onNavigate('')}
                  className="hover:text-[#8CB65F] transition-colors cursor-pointer"
                >
                  דף הבית
                </button>
              </li>
              {quickLinks.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => onNavigate(cleanUrlToRoute(item.url))}
                    className="hover:text-[#8CB65F] transition-colors cursor-pointer"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() => onNavigate('courses')}
                  className="hover:text-[#8CB65F] transition-colors cursor-pointer font-semibold text-[#8CB65F]"
                >
                  קורסים ומבחנים
                </button>
              </li>
            </ul>
          </div>

          {/* Back to Top */}
          <div className="flex flex-col justify-between items-start md:items-end">
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all border border-slate-700 cursor-pointer shadow-xs"
            >
              <ArrowUp size={14} />
              לראש העמוד
            </button>
          </div>
        </div>

        <div className="border-t border-slate-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>{copyright}</p>
          <p className="flex items-center gap-1">
            לימוד מקראות וטעמי המקרא
          </p>
        </div>
      </div>
    </footer>
  );
};

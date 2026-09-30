import React, { useState } from 'react';
import type { MenuItem } from '../types';
import { buildMenuTree, cleanUrlToRoute } from '../utils/menuHelper';
import { Search, Menu, X, ChevronDown, BookOpen, GraduationCap, Home } from 'lucide-react';

interface HeaderProps {
  siteTitle: string;
  tagline: string;
  menuItems: MenuItem[];
  currentRoute: string;
  onNavigate: (route: string) => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  siteTitle,
  tagline,
  menuItems,
  currentRoute,
  onNavigate,
  onOpenSearch,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const menuTree = buildMenuTree(menuItems);

  const handleNavClick = (url: string) => {
    const route = cleanUrlToRoute(url);
    onNavigate(route);
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white shadow-xs transition-all">
      {/* Top Banner / Branding */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <div
          onClick={() => handleNavClick('')}
          className="group flex cursor-pointer items-center gap-3 select-none"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6e9447] to-[#8CB65F] text-white shadow-sm transition-transform group-hover:scale-105">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl leading-none font-black tracking-tight text-slate-800 transition-colors group-hover:text-[#8CB65F]">
              {siteTitle}
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{tagline}</p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200/80"
            title="חיפוש באתר"
          >
            <Search size={15} />
            <span className="hidden sm:inline">חיפוש...</span>
            <kbd className="hidden rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 md:inline">
              Ctrl+K
            </kbd>
          </button>

          <button
            onClick={() => onNavigate('courses')}
            className="hidden cursor-pointer items-center gap-1.5 rounded-xl bg-[#8CB65F] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#7aa252] md:flex"
          >
            <GraduationCap size={16} />
            קורסים
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="cursor-pointer rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 md:hidden"
            aria-label="תפריט"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Desktop Navigation Bar */}
      <nav className="hidden border-t border-slate-200/60 bg-slate-50 md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center gap-1 py-1 text-sm font-semibold text-slate-700">
            <li>
              <button
                onClick={() => handleNavClick('')}
                className={`flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
                  currentRoute === ''
                    ? 'bg-white font-bold text-[#8CB65F] shadow-xs'
                    : 'hover:bg-white/60 hover:text-[#8CB65F]'
                }`}
              >
                <Home size={15} />
                ראשי
              </button>
            </li>

            {menuTree.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const route = cleanUrlToRoute(item.url);
              const isActive = currentRoute === route;

              return (
                <li
                  key={item.id}
                  className="group relative"
                  onMouseEnter={() => setActiveDropdown(item.id)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button
                    onClick={() => handleNavClick(item.url)}
                    className={`flex cursor-pointer items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
                      isActive
                        ? 'bg-white font-bold text-[#8CB65F] shadow-xs'
                        : 'hover:bg-white/60 hover:text-[#8CB65F]'
                    }`}
                  >
                    {item.title}
                    {hasChildren && (
                      <ChevronDown
                        size={14}
                        className="text-slate-400 transition-transform group-hover:rotate-180"
                      />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {hasChildren && (
                    <div
                      className={`absolute top-full right-0 z-50 min-w-[220px] rounded-xl border border-slate-200 bg-white py-2 shadow-lg transition-all duration-150 ${
                        activeDropdown === item.id
                          ? 'visible translate-y-0 opacity-100'
                          : 'invisible -translate-y-1 opacity-0'
                      }`}
                    >
                      {item.children!.map((sub) => {
                        const hasSubChildren = sub.children && sub.children.length > 0;
                        return (
                          <div key={sub.id} className="group/sub relative">
                            <button
                              onClick={() => handleNavClick(sub.url)}
                              className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-right text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#8CB65F]"
                            >
                              <span>{sub.title}</span>
                              {hasSubChildren && (
                                <ChevronDown size={12} className="-rotate-90 text-slate-400" />
                              )}
                            </button>

                            {/* Second level dropdown */}
                            {hasSubChildren && (
                              <div className="absolute top-0 right-full mr-1 hidden min-w-[200px] rounded-xl border border-slate-200 bg-white py-2 shadow-lg group-hover/sub:block">
                                {sub.children!.map((subSub) => (
                                  <button
                                    key={subSub.id}
                                    onClick={() => handleNavClick(subSub.url)}
                                    className="w-full cursor-pointer px-4 py-2 text-right text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-[#8CB65F]"
                                  >
                                    {subSub.title}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}

            <li>
              <button
                onClick={() => onNavigate('courses')}
                className={`cursor-pointer rounded-lg px-3 py-2 transition-colors ${
                  currentRoute === 'courses'
                    ? 'bg-white font-bold text-[#8CB65F] shadow-xs'
                    : 'hover:bg-white/60 hover:text-[#8CB65F]'
                }`}
              >
                קורסים
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="animate-fadeIn max-h-[80vh] space-y-2 overflow-y-auto border-b border-slate-200 bg-white px-4 pt-2 pb-6 md:hidden">
          <button
            onClick={() => handleNavClick('')}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm font-bold text-slate-800 hover:bg-slate-50"
          >
            <Home size={16} />
            ראשי
          </button>
          {menuTree.map((item) => (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => handleNavClick(item.url)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-right text-sm font-bold text-slate-800 hover:bg-slate-50"
              >
                <span>{item.title}</span>
              </button>
              {item.children && (
                <div className="mr-4 space-y-1 border-r-2 border-slate-200 pr-3">
                  {item.children.map((sub) => (
                    <div key={sub.id}>
                      <button
                        onClick={() => handleNavClick(sub.url)}
                        className="block w-full rounded-lg px-3 py-1.5 text-right text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-[#8CB65F]"
                      >
                        {sub.title}
                      </button>
                      {sub.children && (
                        <div className="mr-3 space-y-0.5 border-r border-slate-200 pr-2">
                          {sub.children.map((subSub) => (
                            <button
                              key={subSub.id}
                              onClick={() => handleNavClick(subSub.url)}
                              className="block w-full px-2 py-1 text-right text-[11px] text-slate-500 hover:text-[#8CB65F]"
                            >
                              {subSub.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button
            onClick={() => {
              onNavigate('courses');
              setMobileMenuOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-sm font-bold text-[#8CB65F] hover:bg-emerald-50"
          >
            <GraduationCap size={16} />
            קורסים ומבחנים
          </button>
        </div>
      )}
    </header>
  );
};

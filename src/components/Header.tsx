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
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs transition-all">
      {/* Top Banner / Branding */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => handleNavClick('')}
          className="cursor-pointer flex items-center gap-3 group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#6e9447] to-[#8CB65F] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <BookOpen size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none group-hover:text-[#8CB65F] transition-colors">
              {siteTitle}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{tagline}</p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-600 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            title="חיפוש באתר"
          >
            <Search size={15} />
            <span className="hidden sm:inline">חיפוש...</span>
            <kbd className="hidden md:inline bg-white px-1.5 py-0.5 rounded border border-slate-300 text-[10px] text-slate-400">
              Ctrl+K
            </kbd>
          </button>

          <button
            onClick={() => onNavigate('courses')}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-[#8CB65F] hover:bg-[#7aa252] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <GraduationCap size={16} />
            קורסים
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="תפריט"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Desktop Navigation Bar */}
      <nav className="hidden md:block bg-slate-50 border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex items-center gap-1 text-sm font-semibold text-slate-700 py-1">
            <li>
              <button
                onClick={() => handleNavClick('')}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  currentRoute === '' ? 'text-[#8CB65F] bg-white shadow-xs font-bold' : 'hover:text-[#8CB65F] hover:bg-white/60'
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
                  className="relative group"
                  onMouseEnter={() => setActiveDropdown(item.id)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button
                    onClick={() => handleNavClick(item.url)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'text-[#8CB65F] bg-white shadow-xs font-bold'
                        : 'hover:text-[#8CB65F] hover:bg-white/60'
                    }`}
                  >
                    {item.title}
                    {hasChildren && <ChevronDown size={14} className="text-slate-400 group-hover:rotate-180 transition-transform" />}
                  </button>

                  {/* Dropdown Menu */}
                  {hasChildren && (
                    <div
                      className={`absolute top-full right-0 min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg py-2 transition-all duration-150 z-50 ${
                        activeDropdown === item.id ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1'
                      }`}
                    >
                      {item.children!.map((sub) => {
                        const hasSubChildren = sub.children && sub.children.length > 0;
                        return (
                          <div key={sub.id} className="relative group/sub">
                            <button
                              onClick={() => handleNavClick(sub.url)}
                              className="w-full text-right px-4 py-2 text-xs font-medium text-slate-700 hover:text-[#8CB65F] hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-colors"
                            >
                              <span>{sub.title}</span>
                              {hasSubChildren && <ChevronDown size={12} className="-rotate-90 text-slate-400" />}
                            </button>

                            {/* Second level dropdown */}
                            {hasSubChildren && (
                              <div className="hidden group-hover/sub:block absolute top-0 right-full min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-lg py-2 mr-1">
                                {sub.children!.map((subSub) => (
                                  <button
                                    key={subSub.id}
                                    onClick={() => handleNavClick(subSub.url)}
                                    className="w-full text-right px-4 py-2 text-xs font-medium text-slate-700 hover:text-[#8CB65F] hover:bg-slate-50 cursor-pointer transition-colors"
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
                className={`px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  currentRoute === 'courses' ? 'text-[#8CB65F] bg-white shadow-xs font-bold' : 'hover:text-[#8CB65F] hover:bg-white/60'
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
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-2 animate-fadeIn max-h-[80vh] overflow-y-auto">
          <button
            onClick={() => handleNavClick('')}
            className="w-full text-right px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 rounded-lg flex items-center gap-2"
          >
            <Home size={16} />
            ראשי
          </button>
          {menuTree.map((item) => (
            <div key={item.id} className="space-y-1">
              <button
                onClick={() => handleNavClick(item.url)}
                className="w-full text-right px-3 py-2 text-sm font-bold text-slate-800 hover:bg-slate-50 rounded-lg flex items-center justify-between"
              >
                <span>{item.title}</span>
              </button>
              {item.children && (
                <div className="mr-4 pr-3 border-r-2 border-slate-200 space-y-1">
                  {item.children.map((sub) => (
                    <div key={sub.id}>
                      <button
                        onClick={() => handleNavClick(sub.url)}
                        className="w-full text-right px-3 py-1.5 text-xs text-slate-600 hover:text-[#8CB65F] hover:bg-slate-50 rounded-lg block font-medium"
                      >
                        {sub.title}
                      </button>
                      {sub.children && (
                        <div className="mr-3 pr-2 border-r border-slate-200 space-y-0.5">
                          {sub.children.map((subSub) => (
                            <button
                              key={subSub.id}
                              onClick={() => handleNavClick(subSub.url)}
                              className="w-full text-right px-2 py-1 text-[11px] text-slate-500 hover:text-[#8CB65F] block"
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
            className="w-full text-right px-3 py-2 text-sm font-bold text-[#8CB65F] hover:bg-emerald-50 rounded-lg flex items-center gap-2"
          >
            <GraduationCap size={16} />
            קורסים ומבחנים
          </button>
        </div>
      )}
    </header>
  );
};

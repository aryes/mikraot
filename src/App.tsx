import React, { useState, useEffect } from 'react';
import { contentOfType, siteData } from './data/site';
import type { ContentItem } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PageView } from './components/PageView';
import { CourseView } from './components/CourseView';
import { SearchView } from './components/SearchView';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    let hash = window.location.hash.replace(/^#\/?/, '');
    try {
      hash = decodeURIComponent(hash);
    } catch {}
    return hash;
  });
  const [searchOpen, setSearchOpen] = useState(false);

  // Sync route with window hash
  useEffect(() => {
    const handleHashChange = () => {
      let hash = window.location.hash.replace(/^#\/?/, '');
      try {
        hash = decodeURIComponent(hash);
      } catch {}
      setCurrentRoute(hash);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateTo = (route: string) => {
    let clean = route.replace(/^#\/?/, '');
    try {
      clean = decodeURIComponent(clean);
    } catch {}
    window.location.hash = `#/${clean}`;
  };

  // Find page by slug, title, ID, or hierarchical path segment
  const findContent = (route: string): ContentItem | null => {
    if (!route || route === '' || route === 'home') {
      return (
        siteData.content.find(c => String(c.id) === siteData.site.frontPageId) ??
        siteData.content.find(c => c.slug === 'home' || c.slug === 'מקראות') ??
        siteData.content[0] ??
        null
      );
    }

    const clean = route.toLowerCase().replace(/^\/|\/$/g, '');
    const lastSegment = clean.split('/').pop() || '';

    // 1. Direct full match on slug, rawSlug, title, or ID
    let found = siteData.content.find(c => 
      c.slug.toLowerCase() === clean || 
      c.rawSlug.toLowerCase() === clean ||
      c.title.toLowerCase() === clean ||
      String(c.id) === clean
    );
    if (found) return found;

    // 2. Match by last path segment (handles hierarchical URLs like טעמים/נוסח-אשכנז)
    if (lastSegment) {
      found = siteData.content.find(c => 
        c.slug.toLowerCase() === lastSegment || 
        c.rawSlug.toLowerCase() === lastSegment
      );
      if (found) return found;
    }

    return null;
  };

  const activePage = findContent(currentRoute);

  const courses = contentOfType('lp_course');
  const lessons = contentOfType('lp_lesson');

  return (
    <div className="min-h-screen flex flex-col bg-[#F3F7F5] font-sans antialiased text-[#444444]">
      {/* Header */}
      <Header
        siteTitle={siteData.site.title}
        tagline={siteData.site.tagline}
        menuItems={siteData.menu}
        currentRoute={currentRoute}
        onNavigate={navigateTo}
        onOpenSearch={() => setSearchOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentRoute === 'courses' ? (
          <CourseView
            courses={courses}
            lessons={lessons}
            onSelectCourse={(c) => navigateTo(c.slug || String(c.id))}
            onSelectLesson={(l) => navigateTo(l.slug || String(l.id))}
          />
        ) : activePage ? (
          <PageView page={activePage} onNavigate={navigateTo} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-20 text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-3">העמוד לא נמצא (404)</h2>
            <p className="text-slate-600 mb-6">העמוד המבוקש אינו קיים או שהועבר.</p>
            <button
              onClick={() => navigateTo('')}
              className="px-6 py-2.5 bg-[#8CB65F] hover:bg-[#7aa252] text-white rounded-xl font-bold transition-all shadow-xs cursor-pointer"
            >
              חזרה לדף הבית
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer
        siteTitle={siteData.site.title}
        copyright={siteData.site.copyright}
        menuItems={siteData.menu}
        onNavigate={navigateTo}
      />

      {/* Search Modal */}
      {searchOpen && (
        <SearchView
          items={siteData.content}
          onSelect={(item) => navigateTo(item.slug || String(item.id))}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
};

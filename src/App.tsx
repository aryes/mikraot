import React, { useState, useEffect } from 'react';
import { contentOfType, siteData } from './data/site';
import { findContent, navigateTo, routeFromHash } from './routing';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { PageView } from './components/PageView';
import { CourseView } from './components/CourseView';
import { SearchView } from './components/SearchView';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState(() => routeFromHash(window.location.hash));
  const [searchOpen, setSearchOpen] = useState(false);

  // Sync route with window hash
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(routeFromHash(window.location.hash));
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
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activePage = findContent(currentRoute);

  const courses = contentOfType('lp_course');
  const lessons = contentOfType('lp_lesson');

  return (
    <div className="flex min-h-screen flex-col bg-[#F3F7F5] font-sans text-[#444444] antialiased">
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
          <div className="mx-auto max-w-3xl px-4 py-20 text-center">
            <h2 className="mb-3 text-3xl font-bold text-slate-800">העמוד לא נמצא (404)</h2>
            <p className="mb-6 text-slate-600">העמוד המבוקש אינו קיים או שהועבר.</p>
            <button
              onClick={() => navigateTo('')}
              className="cursor-pointer rounded-xl bg-[#8CB65F] px-6 py-2.5 font-bold text-white shadow-xs transition-all hover:bg-[#7aa252]"
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

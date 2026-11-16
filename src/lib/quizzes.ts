/**
 * The quizzes, for the page that gathers them ("חידונים", src/components/QuizSummary.tsx; Arye,
 * 2026-11-15: "one page summarizing all quizzes", linked from each). Their titles and order are
 * the menu's, under "חידונים" (src/data/menu.json); here, each one's page and the `storage` name its
 * memory is kept under (QuizConfig in src/components/Quiz.tsx). A quiz missing here fails the test.
 */
export const QUIZZES_PAGE = '/חידונים/';

export interface QuizEntry {
  storage: string;
}

/** Each quiz's page and its `storage`. */
export const QUIZ_STORAGE: Readonly<Record<string, QuizEntry>> = {
  '/זיהוי-טעמים/': { storage: 'trope-quiz' },
  '/סימן-הטעם/': { storage: 'sign-quiz' },
  '/זיהוי-ניקוד/': { storage: 'niqqud-quiz' },
  '/סוג-התנועה/': { storage: 'vowel-class-quiz' },
  '/קמץ-גדול-או-קטן/': { storage: 'qamats-quiz' },
  '/זיהוי-משרתים/': { storage: 'servant-quiz' },
  '/דגש-חזק-או-קל/': { storage: 'dagesh-quiz' },
  '/שווא-נע-או-נח/': { storage: 'shva-quiz' },
  '/למה-השווא-נע/': { storage: 'shva-why-quiz' },
  '/למה-הקמץ-קטן/': { storage: 'qamats-why-quiz' },
};

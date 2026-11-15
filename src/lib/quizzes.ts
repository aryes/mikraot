/**
 * The quizzes, for the page that gathers them ("חידונים", src/components/QuizSummary.tsx; Arye,
 * 2026-11-15: "one page summarizing all quizzes", linked from each). Their titles and order are
 * the menu's, under "חידונים" (src/data/menu.json); here, each one's page and the `storage` name its
 * memory is kept under (QuizConfig in src/components/Quiz.tsx), and whether its options get harder
 * with its level: not where they are fixed (`options` in QuizConfig: two or three kinds to choose
 * from). A quiz missing here fails the test.
 */
export const QUIZZES_PAGE = '/חידונים/';

export interface QuizEntry {
  storage: string;
  levels: boolean;
}

/** Each quiz's page, its `storage`, and whether it has levels. */
export const QUIZ_STORAGE: Readonly<Record<string, QuizEntry>> = {
  '/זיהוי-טעמים/': { storage: 'trope-quiz', levels: true },
  '/סימן-הטעם/': { storage: 'sign-quiz', levels: true },
  '/זיהוי-ניקוד/': { storage: 'niqqud-quiz', levels: true },
  '/סוג-התנועה/': { storage: 'vowel-class-quiz', levels: false },
  '/קמץ-גדול-או-קטן/': { storage: 'qamats-quiz', levels: false },
  '/זיהוי-משרתים/': { storage: 'servant-quiz', levels: true },
  '/דגש-חזק-או-קל/': { storage: 'dagesh-quiz', levels: false },
  '/שווא-נע-או-נח/': { storage: 'shva-quiz', levels: false },
  '/למה-השווא-נע/': { storage: 'shva-why-quiz', levels: true },
  '/למה-הקמץ-קטן/': { storage: 'qamats-why-quiz', levels: false },
};

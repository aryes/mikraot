/**
 * The quizzes, for the page that gathers them ("חידונים", src/components/QuizSummary.tsx; Arye,
 * 2026-11-15: "one page summarizing all quizzes", linked from each). Their titles and order are
 * the menu's, under "חידונים" (src/data/menu.json); here, each one's page, the `storage` name its
 * memory is kept under (QuizConfig in src/components/Quiz.tsx). A quiz missing here fails the test.
 */
export const QUIZZES_PAGE = '/חידונים/';

export interface QuizEntry {
  storage: string;
  /** What the quiz asks, in a line under its name on the quizzes page (Arye's words, 2026-11-17). */
  description: string;
}

/** Each quiz's page, its `storage` and its description. */
export const QUIZ_STORAGE: Readonly<Record<string, QuizEntry>> = {
  '/זיהוי-טעמים/': {
    storage: 'trope-quiz',
    description: 'זהו את שם הטעם לפי הסימן שלו.',
  },
  '/סימן-הטעם/': {
    storage: 'sign-quiz',
    description: 'זהו את סימן הטעם לפי השם שלו.',
  },
  '/זיהוי-ניקוד/': {
    storage: 'niqqud-quiz',
    description: 'זהו את הניקוד.',
  },
  '/סוג-התנועה/': {
    storage: 'vowel-class-quiz',
    description: 'סווגו את התנועה המסומנת: גדולה, קטנה או חטופה?',
  },
  '/קמץ-גדול-או-קטן/': {
    storage: 'qamats-quiz',
    description: 'האם הקמץ המסומן גדול או קטן?',
  },
  '/זיהוי-משרתים/': {
    storage: 'servant-quiz',
    description: 'איזה טעם משרת מתאים לטעם שאחריו?',
  },
  '/דגש-חזק-או-קל/': {
    storage: 'dagesh-quiz',
    description: 'האם הדגש המסומן חזק או קל?',
  },
  '/שווא-נע-או-נח/': {
    storage: 'shva-quiz',
    description: 'האם השווא המסומן נע או נח?',
  },
  '/למה-השווא-נע/': {
    storage: 'shva-why-quiz',
    description: 'איזה כלל הפך את השווא לנע?',
  },
  '/למה-הקמץ-קטן/': {
    storage: 'qamats-why-quiz',
    description: 'איזה כלל הפך את הקמץ לקטן?',
  },
};

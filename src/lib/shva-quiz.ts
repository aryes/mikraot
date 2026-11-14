/**
 * The shva quiz ("שווא נע או נח?", src/components/ShvaQuiz.tsx; Arye, 2026-11-14): a word from the
 * Torah with a shva marked, נע or נח? Only shvas the rules of the site's page "שווא נע" settle
 * (scripts/quiz/shva-words.ts), each by its rule, which the feedback names: "למה נע? בראש מילה."
 * A round asks five of each, every rule among them. Its list: public/quiz/shva-words.json.
 */
import type { QuizKind } from './quiz';

export const SHVA_KINDS = ['שווא-נע', 'שווא-נח'] as const;

/** The page's rules for a שווא נע (אבגד״ה, in its order), each a group of the list. */
export const NA_REASONS: Readonly<Record<string, string>> = {
  'נע-ראש': 'בראש מילה.',
  'נע-שני': 'השני משני שוואים רצופים.',
  'נע-גדולה': 'אחרי תנועה גדולה.',
  'נע-דגש': 'באות דגושה.',
  'נע-דומות': 'בראשונה משתי אותיות זהות.',
};

/** And for a שווא נח, where none of them applies. */
export const NACH_REASONS: Readonly<Record<string, string>> = {
  'נח-קטנה': 'אחרי תנועה קטנה.',
  'נח-סוף': 'בסוף מילה.',
};

export const SHVA_GROUPS = [...Object.keys(NA_REASONS), ...Object.keys(NACH_REASONS)];

/** A round: one שווא נע by each rule, four נח after a short vowel and one at a word's end. */
export const SHVA_PER_GROUP: Readonly<Record<string, number>> = {
  ...Object.fromEntries(Object.keys(NA_REASONS).map((group) => [group, 1])),
  'נח-קטנה': 4,
  'נח-סוף': 1,
};

/** A group's answer. */
export const shvaKind = (group: string) => (group in NA_REASONS ? 'שווא-נע' : 'שווא-נח');

/** Why, in the feedback: "למה נע? בראש מילה." */
export function shvaReason(group: string): string | undefined {
  const na = NA_REASONS[group];
  if (na) return `למה נע? ${na}`;
  const nach = NACH_REASONS[group];
  return nach && `למה נח? ${nach}`;
}

export const SHVA_QUIZ: QuizKind = { ids: SHVA_KINDS, lookAlikes: [] };

/** The page on the שווא נע, which the feedback links to. */
export const SHVA_PAGE = '/שווא-נע/';

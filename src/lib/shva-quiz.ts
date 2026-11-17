/**
 * The shva quiz ("שווא נע או נח", src/components/ShvaQuiz.tsx; Arye, 2026-11-14): a word from the
 * Torah with a shva marked, נע or נח? Only shvas the rules of the site's page "שווא נע" settle
 * (scripts/quiz/shva-words.ts), each by its rule. The feedback names a שווא נע's rule: "למה נע? בראש
 * מילה." A שווא נח is the default, as a קמץ גדול is in the qamats quiz, so it gets none (Arye,
 * 2026-11-15).
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

/** And a שווא נח, where none of them applies: after a short vowel, or at a word's end. */
const NACH_GROUPS = ['נח-קטנה', 'נח-סוף'];

export const SHVA_GROUPS = [...Object.keys(NA_REASONS), ...NACH_GROUPS];

/** A round: one שווא נע by each rule, four נח after a short vowel and one at a word's end. */
export const SHVA_PER_GROUP: Readonly<Record<string, number>> = {
  ...Object.fromEntries(Object.keys(NA_REASONS).map((group) => [group, 1])),
  'נח-קטנה': 4,
  'נח-סוף': 1,
};

/** A group's answer. */
export const shvaKind = (group: string) => (group in NA_REASONS ? 'שווא-נע' : 'שווא-נח');

/** Why a שווא is נע, in the feedback: "למה נע? בראש מילה." None for a שווא נח. */
export function shvaReason(group: string): string | undefined {
  const na = NA_REASONS[group];
  return na && `למה נע? ${na}`;
}

export const SHVA_QUIZ: QuizKind = { ids: SHVA_KINDS, lookAlikes: [] };

/**
 * The "why" quiz ("למה השווא נע", src/components/ShvaWhyQuiz.tsx; Arye's idea of 2026-11-15): a
 * שווא נע marked, which of the page's rules makes it נע? The shva quiz's list holds each word's
 * rule, and the other rules that apply to it too (`x`, never offered as wrong: the page itself
 * gives בְּכוֹר two). Each rule's name as an option: NA_REASONS without its full stop.
 */
export const NA_RULES: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(NA_REASONS).map(([group, reason]) => [group, reason.replace(/\.$/u, '')]),
);

export const NA_GROUPS = Object.keys(NA_RULES);

/**
 * Rules a word often has together, so offered together as the learner answers well: a dagesh
 * with a word's start or a second shva; a long vowel with identical letters.
 */
export const SHVA_WHY_QUIZ: QuizKind = {
  ids: NA_GROUPS,
  lookAlikes: [
    ['נע-ראש', 'נע-שני', 'נע-דגש'],
    ['נע-גדולה', 'נע-דומות'],
  ],
};

/** The page on the שווא נע, which the feedback links to. */
export const SHVA_PAGE = '/שווא-נע/';

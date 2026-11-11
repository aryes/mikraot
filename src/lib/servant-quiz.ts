/**
 * The servant quiz ("איזה משרת?", src/components/ServantQuiz.tsx; Arye, 2026-11-11: "which
 * mesharet is used for which trope"): two words from the Torah, the first without its servant
 * (משרת), the second with the disjunctive (מפסיק) it serves; which servant is missing? Its word
 * list, public/quiz/servant-words.json, is keyed by the disjunctive, each item naming its servant
 * (`a`) and the other servants that come before that disjunctive (`x`), never offered as wrong.
 */
import type { QuizKind } from './quiz';

/** The servants (משרתים) of the Torah's tropes, as src/data/tropes.json names them. */
export const SERVANTS = [
  'מונח',
  'מהפך',
  'מרכא',
  'מרכא-כפולה',
  'דרגא',
  'קדמא',
  'תלישא-קטנה',
  'ירח-בן-יומו',
] as const;

/** The disjunctives (מפסיקים) a servant may serve: the word list's entries. */
export const DISJUNCTIVES = [
  'סוף-פסוק',
  'אתנחתא',
  'סגול',
  'זקף-קטן',
  'זקף-גדול',
  'טפחא',
  'רביעי',
  'זרקא',
  'פשטא',
  'יתיב',
  'תביר',
  'גרש',
  'גרשיים',
  'פזר',
  'קרני-פרה',
  'תלישא-גדולה',
  'מונח-לגרמיה',
] as const;

export const SERVANT_QUIZ: QuizKind = {
  ids: SERVANTS,
  // Not shapes (the sign is hidden): at a higher level, the common servants instead of the rare.
  lookAlikes: [['מונח', 'מרכא', 'מהפך', 'דרגא', 'קדמא']],
  nearMiss: false,
};

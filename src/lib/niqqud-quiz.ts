/**
 * The niqqud quiz ("מה הניקוד?", src/components/NiqqudQuiz.tsx; Arye, 2026-11-10: "same as the
 * trope quiz"): a word from the Torah with one letter marked, and four niqqud names to choose from
 * (the shared parts: quiz.ts). Its word list is public/quiz/niqqud-words.json; the words are shown
 * without their cantillation marks, so only the niqqud is asked about.
 */
import type { QuizKind } from './quiz';

/**
 * The niqqud the quiz asks about, named as in the table of "תנועות, עיצורים וניקוד" (its page:
 * NIQQUD_PAGE). קמץ קטן is left out: its sign is a קמץ's.
 */
export const QUIZ_VOWELS = [
  'קמץ',
  'פתח',
  'חטף-פתח',
  'צירה',
  'סגול',
  'חטף-סגול',
  'חיריק-מלא',
  'חיריק-חסר',
  'חולם-מלא',
  'חולם-חסר',
  'חטף-קמץ',
  'שורוק',
  'קבוץ',
  'שווא',
] as const;

/** Signs that look alike: the same dots or lines in another number, place or order. */
export const VOWEL_LOOK_ALIKES: readonly (readonly string[])[] = [
  ['קמץ', 'פתח', 'חטף-פתח', 'חטף-קמץ'],
  ['צירה', 'סגול', 'חטף-סגול', 'שווא'],
  ['שווא', 'חטף-פתח', 'חטף-סגול', 'חטף-קמץ'],
  ['חיריק-חסר', 'חיריק-מלא', 'צירה'],
  ['חולם-חסר', 'חולם-מלא', 'שורוק'],
  ['שורוק', 'קבוץ'],
  ['קבוץ', 'סגול'],
];

export const NIQQUD_QUIZ: QuizKind = { ids: QUIZ_VOWELS, lookAlikes: VOWEL_LOOK_ALIKES };

/** The page with the table of all the niqqud, which the feedback links to. */
export const NIQQUD_PAGE = '/תנועות-עיצורים-וניקוד/';

/** An id as it is shown: "חטף-פתח" is "חטף פתח". */
export const vowelName = (id: string) => id.replaceAll('-', ' ');

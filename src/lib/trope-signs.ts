/**
 * How each trope's sign is drawn on its own, without a word from the Torah: the answers of the
 * sign quiz (src/components/SignQuiz.tsx), and the questions of the trope quiz's one-letter level.
 * מאילא has none: on one letter its sign is a טפחא's.
 */
import type { QuizKind } from './quiz';
import { LOOK_ALIKES, QUIZ_TROPES } from './trope-quiz';

/**
 * Each trope's sign on one א (Arye, 2026-11-15): the site's font draws each where it sits on a
 * word, so look-alikes differ by place too (קדמא over the letter's middle, פשטא at its left edge;
 * תלישא גדולה at its right, תלישא קטנה at its left). More than one letter only where the trope has
 * signs on more than one: שני פשטין (two letters), קדמא ואזלא (two words), קדמא before a זקף קטן
 * (two words joined by a מקף); שלשלת and מונח לגרמיה with their פסק.
 */
export const SIGNS: Readonly<Record<string, string>> = {
  'סוף-פסוק': 'אֽ׃',
  אתנחתא: 'אָ֑',
  סגול: 'א֒',
  שלשלת: 'א֓ ׀',
  'זקף-קטן': 'א֔',
  'זקף-גדול': 'א֕',
  טפחא: 'א֖',
  רביעי: 'א֗',
  זרקא: 'א֮',
  פשטא: 'א֙',
  'שני-פשטין': 'א֨א֙',
  יתיב: 'אָ֚',
  תביר: 'א֛',
  גרש: 'א֜',
  גרשיים: 'א֞',
  'קרני-פרה': 'א֟',
  'תלישא-גדולה': 'א֠',
  פזר: 'א֡',
  מונח: 'אָ֣',
  'מונח-לגרמיה': 'אָ֣ ׀',
  מהפך: 'אָ֤',
  מרכא: 'א֥',
  'מרכא-כפולה': 'א֦',
  דרגא: 'א֧',
  קדמא: 'א֨',
  'קדמא-ואזלא': 'א֨ א֜',
  'קדמא-זקף-קטן': 'א֨־א֔',
  'תלישא-קטנה': 'א֩',
  'ירח-בן-יומו': 'א֪',
};

/** The trope quiz's tropes that have a sign here (all but מאילא). */
export const SIGNED_TROPES = QUIZ_TROPES.filter((id) => id in SIGNS);

/** Those tropes, with the trope quiz's look-alikes among them, for a quiz's options. */
export const SIGN_KIND: QuizKind = {
  ids: SIGNED_TROPES,
  lookAlikes: LOOK_ALIKES.map((group) => group.filter((id) => id in SIGNS)).filter(
    (group) => group.length > 1,
  ),
};

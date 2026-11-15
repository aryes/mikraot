/**
 * How each trope's sign is drawn on its own, without a word from the Torah: the answers of the
 * sign quiz (src/components/SignQuiz.tsx), and the questions of the trope quiz's one-letter level.
 * מאילא has none: on one letter its sign is a טפחא's.
 */
import type { QuizKind } from './quiz';
import { LOOK_ALIKES, QUIZ_TROPES } from './trope-quiz';

/**
 * Each trope's sign on an א; two words where it takes two (קדמא ואזלא). פשטא and the two תלישות
 * on two letters, where the sign's place in the word shows (פשטא and תלישא קטנה on the last,
 * תלישא גדולה on the first). קדמא on one (Arye, 2026-11-15): the site's font draws it over the
 * letter's middle and a פשטא at its left edge, so one letter tells them apart too.
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
  פשטא: 'אא֙',
  'שני-פשטין': 'א֨א֙',
  יתיב: 'אָ֚',
  תביר: 'א֛',
  גרש: 'א֜',
  גרשיים: 'א֞',
  'קרני-פרה': 'א֟',
  'תלישא-גדולה': 'א֠א',
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
  'תלישא-קטנה': 'אא֩',
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

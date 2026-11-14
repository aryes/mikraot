/**
 * The sign quiz ("מה הסימן?", src/components/SignQuiz.tsx; Arye, 2026-11-14: "find the trope sign
 * given the trope name"): the trope quiz turned around, a trope's name and four signs to choose
 * from, each on an א; with a קמץ for יתיב and מהפך, which sit on either side of it (Arye), and for
 * their look-alikes (מונח, מונח לגרמיה, אתנחתא), so the vowel tells nothing.
 * מאילא is left out: on one letter its sign is a טפחא's.
 */
import type { QuizKind } from './quiz';
import { LOOK_ALIKES, QUIZ_TROPES } from './trope-quiz';

/**
 * Each trope's sign on an א; two words where it takes two (קדמא ואזלא). On two letters where the
 * place tells look-alikes apart, which one letter can't show in the site's font (checked
 * 2026-11-15): קדמא on the first, פשטא on the last, תלישא גדולה on the first, קטנה on the last.
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
  קדמא: 'א֨א',
  'קדמא-ואזלא': 'א֨ א֜',
  'קדמא-זקף-קטן': 'א֨־א֔',
  'תלישא-קטנה': 'אא֩',
  'ירח-בן-יומו': 'א֪',
};

export const SIGN_TROPES = QUIZ_TROPES.filter((id) => id in SIGNS);

export const SIGN_QUIZ: QuizKind = {
  ids: SIGN_TROPES,
  lookAlikes: LOOK_ALIKES.map((group) => group.filter((id) => id in SIGNS)).filter(
    (group) => group.length > 1,
  ),
};

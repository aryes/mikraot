/**
 * The sign quiz ("מה הסימן?", src/components/SignQuiz.tsx; Arye, 2026-11-14: "find the trope sign
 * given the trope name"): the trope quiz turned around, a trope's name and four signs to choose
 * from, each on an א (SIGNS, src/lib/trope-signs.ts); with a קמץ for יתיב and מהפך, which sit on
 * either side of it (Arye), and for their look-alikes (מונח, מונח לגרמיה, אתנחתא), so the vowel
 * tells nothing.
 * מאילא is left out: on one letter its sign is a טפחא's.
 */
import type { QuizKind } from './quiz';
import { LOOK_ALIKES, QUIZ_TROPES } from './trope-quiz';
import { SIGNS } from './trope-signs';

export const SIGN_TROPES = QUIZ_TROPES.filter((id) => id in SIGNS);

export const SIGN_QUIZ: QuizKind = {
  ids: SIGN_TROPES,
  lookAlikes: LOOK_ALIKES.map((group) => group.filter((id) => id in SIGNS)).filter(
    (group) => group.length > 1,
  ),
};

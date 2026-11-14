/**
 * The niqqud quiz ("מה הניקוד?", src/components/NiqqudQuiz.tsx; Arye, 2026-11-10: "same as the
 * trope quiz"): a word from the Torah with one letter marked, and four niqqud names to choose from
 * (the shared parts: quiz.ts). Its word list is public/quiz/niqqud-words.json; the words are shown
 * without their cantillation marks, so only the niqqud is asked about. The vowel-class quiz,
 * below, asks about the same words.
 */
import type { QuizKind } from './quiz';

/**
 * The niqqud the quiz asks about, named as in the table of "תנועות, עיצורים וניקוד" (its page:
 * NIQQUD_PAGE). קמץ קטן is left out: its sign is a קמץ's (the word list has it apart, for
 * VOWEL_CLASS_QUIZ).
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

/**
 * Each name with its niqqud (Arye, 2026-11-14), in the forms whose letters carry the vowel they
 * name (קָמָץ, צֵירֵה, שׁוּרוּק).
 */
const POINTED: Readonly<Record<string, string>> = {
  קמץ: 'קָמָץ',
  פתח: 'פַּתָּח',
  'חטף-פתח': 'חֲטַף פַּתָּח',
  צירה: 'צֵירֵה',
  סגול: 'סֶגּוֹל',
  'חטף-סגול': 'חֲטַף סֶגּוֹל',
  'חיריק-מלא': 'חִירִיק מָלֵא',
  'חיריק-חסר': 'חִירִיק חָסֵר',
  'חולם-מלא': 'חוֹלָם מָלֵא',
  'חולם-חסר': 'חוֹלָם חָסֵר',
  'חטף-קמץ': 'חֲטַף קָמָץ',
  שורוק: 'שׁוּרוּק',
  קבוץ: 'קֻבּוּץ',
  שווא: 'שְׁוָא',
  'קמץ-קטן': 'קָמָץ קָטָן',
};

/** An id with its niqqud, as both quizzes show it: "חטף-פתח" is "חֲטַף פַּתָּח". */
export const pointedName = (id: string) => POINTED[id] ?? vowelName(id);

/** The word list's entries: the quiz's niqqud, and the קמץ קטן, which only VOWEL_CLASS_OF asks. */
export const NIQQUD_GROUPS = [...QUIZ_VOWELS, 'קמץ-קטן'] as const;

/**
 * The vowel-class quiz ("גדולה, קטנה או חטופה?", src/components/VowelClassQuiz.tsx; Arye,
 * 2026-11-11): the same words, asking whether the marked vowel is long, short or hataf, as the
 * columns of the niqqud table divide them. Not the שווא, which is in the hataf column only when
 * it is a שווא נע: the quiz can't tell which.
 */
export const VOWEL_CLASSES = ['גדולה', 'קטנה', 'חטופה'] as const;

export const VOWEL_CLASS_OF: Readonly<Record<string, (typeof VOWEL_CLASSES)[number]>> = {
  קמץ: 'גדולה',
  צירה: 'גדולה',
  'חיריק-מלא': 'גדולה',
  'חולם-מלא': 'גדולה',
  'חולם-חסר': 'גדולה',
  שורוק: 'גדולה',
  פתח: 'קטנה',
  סגול: 'קטנה',
  'חיריק-חסר': 'קטנה',
  'קמץ-קטן': 'קטנה',
  קבוץ: 'קטנה',
  'חטף-פתח': 'חטופה',
  'חטף-סגול': 'חטופה',
  'חטף-קמץ': 'חטופה',
};

export const VOWEL_CLASS_QUIZ: QuizKind = { ids: VOWEL_CLASSES, lookAlikes: [] };

/**
 * The qamats quiz ("קמץ גדול או קטן?", src/components/QamatsQuiz.tsx; from the list of quiz ideas
 * of 2026-11-11): a word with a qamats marked, its cantillation kept (the stress tells the kinds
 * apart); which kind? Its list, public/quiz/qamats-words.json, has the קמץ קטן by the rule that
 * makes it one (Arye, 2026-11-14: explain why, and ask every kind), and a round asks five of each
 * kind (QAMATS_PER_GROUP), since a קמץ קטן is rare in the text.
 */
export const QAMATS_KINDS = ['קמץ-גדול', 'קמץ-קטן'] as const;

/** The rules of the page "קמץ קטן", in its order: each a group of the list, and why. */
export const QATAN_REASONS: Readonly<Record<string, string>> = {
  'קטן-דגש': 'לפני אות עם דגש חזק.',
  'קטן-שווא': 'לפני שווא נח, בלי מתג.',
  'קטן-מקף': 'התנועה האחרונה במילה, לפני מקף.',
  'קטן-נחים': 'ו׳ בפתח ואחריה שני קמצים: השני קטן.',
};

export const QAMATS_GROUPS = ['קמץ-גדול', ...Object.keys(QATAN_REASONS)];

/** A round: five קמץ גדול, and five קמץ קטן with every rule among them. */
export const QAMATS_PER_GROUP: Readonly<Record<string, number>> = {
  'קמץ-גדול': 5,
  'קטן-דגש': 1,
  'קטן-שווא': 2,
  'קטן-מקף': 1,
  'קטן-נחים': 1,
};

/** A group's answer: the קמץ קטן whatever its rule. */
export const qamatsKind = (group: string) => (group in QATAN_REASONS ? 'קמץ-קטן' : group);

export const QAMATS_QUIZ: QuizKind = { ids: QAMATS_KINDS, lookAlikes: [] };

/** The page on the קמץ קטן, which the feedback links to. */
export const QAMATS_PAGE = '/קמץ-קטן/';

/**
 * The trope quiz ("מה הטעם?", src/components/TropeQuiz.tsx): a word from the Torah and four trope
 * names to choose from (the shared parts: quiz.ts). Its word list is public/quiz/trope-words.json;
 * its prepared questions (src/data/quiz/prepared.json) ask about the rare tropes and the tricky
 * pairs.
 */
import type { QuizKind } from './quiz';

/** The tropes the quiz asks about and offers: every sign of src/data/tropes.json but פסק and מתג. */
export const QUIZ_TROPES = [
  'סוף-פסוק',
  'אתנחתא',
  'סגול',
  'שלשלת',
  'זקף-קטן',
  'זקף-גדול',
  'טפחא',
  'מאילא',
  'רביעי',
  'זרקא',
  'פשטא',
  'שני-פשטין',
  'יתיב',
  'תביר',
  'גרש',
  'גרשיים',
  'קרני-פרה',
  'תלישא-גדולה',
  'פזר',
  'מונח',
  'מונח-לגרמיה',
  'מהפך',
  'מרכא',
  'מרכא-כפולה',
  'דרגא',
  'קדמא',
  'קדמא-ואזלא',
  'קדמא-זקף-קטן',
  'תלישא-קטנה',
  'ירח-בן-יומו',
] as const;

/**
 * Signs that look alike: the same shape in another place, a mirror image, one stroke more. A trope
 * may be in several groups.
 */
export const LOOK_ALIKES: readonly (readonly string[])[] = [
  ['קדמא', 'פשטא', 'שני-פשטין'],
  ['קדמא', 'גרש', 'קדמא-ואזלא'],
  ['גרש', 'גרשיים'],
  ['קדמא', 'זקף-קטן', 'קדמא-זקף-קטן'],
  ['זקף-קטן', 'זקף-גדול', 'רביעי'],
  ['מרכא', 'מרכא-כפולה', 'טפחא', 'תביר', 'דרגא'],
  ['טפחא', 'מאילא'],
  ['מונח', 'מהפך', 'אתנחתא', 'יתיב'],
  ['מונח', 'מונח-לגרמיה'],
  ['תלישא-קטנה', 'תלישא-גדולה'],
  ['פזר', 'קרני-פרה'],
  ['זרקא', 'שלשלת'],
  ['דרגא', 'שלשלת'],
  ['מהפך', 'ירח-בן-יומו'],
];

/**
 * Names that would also be right for what a question shows: a מאילא is shown with the אתנח or
 * סוף פסוק of its chain; קדמא ואזלא and קדמא־זקף קטן are made of their parts.
 */
const ALSO_SHOWN: Readonly<Record<string, readonly string[]>> = {
  מאילא: ['אתנחתא', 'סוף-פסוק'],
  'קדמא-ואזלא': ['קדמא', 'גרש'],
  'קדמא-זקף-קטן': ['קדמא', 'זקף-קטן'],
};

export const TROPE_QUIZ: QuizKind = {
  ids: QUIZ_TROPES,
  lookAlikes: LOOK_ALIKES,
  alsoShown: ALSO_SHOWN,
};

/** Ranks are pointed: without vowels מִשְׁנֶה reads as משנה, the Mishnah. */
export interface Rank {
  /** The share of right answers it takes. */
  min: number;
  name: string;
  /** Its section on the page of the trope hierarchy (/trope-hierarchy/). */
  anchor: string;
  line: string;
}

const LOWEST: Rank = {
  min: 0,
  name: 'מְשָׁרֵת',
  anchor: 'servants',
  line: 'בלי משרתים אין מלכים. עוד סבב?',
};

/** The ranks of the trope hierarchy, highest first. */
export const RANKS: readonly Rank[] = [
  { min: 1, name: 'קֵיסָר', anchor: 'emperors', line: 'סוף פסוק לטעויות!' },
  { min: 0.8, name: 'מֶלֶךְ', anchor: 'kings', line: 'עוד קצת, והכתר של הקיסר שלכם.' },
  { min: 0.6, name: 'מִשְׁנֶה', anchor: 'dukes', line: 'מִשְׁנֶה: המלוכה כבר קרובה.' },
  { min: 0.4, name: 'שָׁלִישׁ', anchor: 'counts', line: 'עולים במדרג. עוד סבב?' },
  LOWEST,
];

/** The rank a round's score earns (Arye, 2026-11-06): out of ten, 10 קיסר down to 0–3 משרת. */
export const rankOf = (score: number, size: number): Rank =>
  RANKS.find((rank) => score >= rank.min * size) ?? LOWEST;

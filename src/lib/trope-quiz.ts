/**
 * The trope quiz ("מה הטעם?", src/components/TropeQuiz.tsx): a word from the Torah and four
 * names to choose from. Questions are drawn at random from the word list that
 * scripts/quiz/build-word-list.ts makes from the Torah (public/quiz/trope-words.json), plus a few
 * prepared ones (src/data/quiz/prepared.json) for the rare tropes and the tricky pairs.
 *
 * The wrong options start random and turn into look-alikes as the learner answers well (Arye,
 * 2026-11-05). Random options pair up too, so the odd one out doesn't give the answer away.
 */

/** A word or maqaf chain from the Torah; `m`: the index of the chain's word to mark. */
export interface QuizItem {
  w: string;
  m?: number;
}

/** public/quiz/trope-words.json. */
export interface WordList {
  source: string;
  license: string;
  items: Record<string, QuizItem[]>;
}

/** A hand-made question: its own wrong options (optional) and an explanation. */
export interface PreparedQuestion {
  trope: string;
  item: QuizItem;
  options?: string[];
  why: string;
}

export interface Question {
  /** Identifies the question across rounds (the recently asked list). */
  key: string;
  trope: string;
  item: QuizItem;
  options?: string[];
  why?: string;
}

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

/** Tropes with fewer words than this in the Torah are asked only in prepared questions. */
export const MIN_RANDOM = 20;
/** The highest level: all three wrong options look like the answer. */
export const MAX_LEVEL = 3;

export const lookAlikes = (id: string): string[] =>
  [...new Set(LOOK_ALIKES.filter((group) => group.includes(id)).flat())].filter(
    (other) => other !== id,
  );

/** A copy in random order: each item sorted by a random number of its own. */
export const shuffle = <T>(items: readonly T[], random: () => number = Math.random): T[] =>
  items
    .map((item) => ({ item, at: random() }))
    // oxlint-disable-next-line unicorn/no-array-sort -- a fresh array; toSorted needs Safari 16
    .sort((a, b) => a.at - b.at)
    .map(({ item }) => item);

/**
 * Four options, the answer among them. `level` (0 to MAX_LEVEL) of them look like the answer; the
 * rest are random, each brought with a look-alike of its own once the level is above 0.
 */
export function chooseOptions(
  answer: string,
  level: number,
  random: () => number = Math.random,
): string[] {
  const excluded = new Set([answer, ...(ALSO_SHOWN[answer] ?? [])]);
  const picked = [answer];
  const free = (id: string) => !excluded.has(id) && !picked.includes(id);
  for (const id of shuffle(lookAlikes(answer), random).slice(0, level))
    if (free(id)) picked.push(id);
  for (const id of shuffle(QUIZ_TROPES, random)) {
    if (picked.length === 4) break;
    if (!free(id)) continue;
    picked.push(id);
    const partner = shuffle(lookAlikes(id), random).find(free);
    if (level > 0 && partner && picked.length < 4) picked.push(partner);
  }
  return shuffle(picked, random);
}

/** Two right answers in a row raise the level; a wrong one lowers it. */
export function nextLevel(
  level: number,
  streak: number,
  correct: boolean,
): { level: number; streak: number } {
  if (!correct) return { level: Math.max(0, level - 1), streak: 0 };
  if (streak + 1 >= 2) return { level: Math.min(MAX_LEVEL, level + 1), streak: 0 };
  return { level, streak: streak + 1 };
}

const keyOf = (trope: string, item: QuizItem) => `${trope}|${item.w}`;

/**
 * A round: `preparedCount` prepared questions and the rest random, in random order, none asked
 * recently if that can be helped, and no trope twice.
 */
export function buildRound(
  list: WordList,
  prepared: readonly PreparedQuestion[],
  recent: ReadonlySet<string>,
  { size = 10, preparedCount = 2, random = Math.random } = {},
): Question[] {
  const round: Question[] = [];
  // Each trope once a round (Arye, 2026-11-06): a question about a trope already asked is skipped.
  const fresh = <T extends { key: string; trope: string }>(candidates: T[]) => {
    const unused = candidates.filter((c) => !round.some((q) => q.trope === c.trope));
    return unused.find((c) => !recent.has(c.key)) ?? unused[0];
  };
  const preparedQuestions = shuffle(
    prepared.map((p) => ({ ...p, key: keyOf(p.trope, p.item) })),
    random,
  );
  for (let i = 0; i < preparedCount; i++) {
    const question = fresh(preparedQuestions);
    if (question) round.push(question);
  }
  const tropes = Object.keys(list.items).filter(
    (id) => (list.items[id]?.length ?? 0) >= MIN_RANDOM,
  );
  for (const trope of shuffle(tropes, random)) {
    if (round.length === size) break;
    const items = (list.items[trope] ?? []).map((item) => ({
      trope,
      item,
      key: keyOf(trope, item),
    }));
    const question = fresh(shuffle(items, random));
    if (question) round.push(question);
  }
  return shuffle(round, random);
}

/** The cheers after a right answer, one at random so it doesn't repeat itself. */
export const CHEERS = ['נכון!', 'בדיוק!', 'יפה מאוד!', 'קלעתם!', 'מצוין!'];

/**
 * What the feedback opens with: a cheer, or after a mistake a kinder word when the two tropes
 * really are alike.
 */
export function cheer(answer: string, chosen: string, random: () => number = Math.random): string {
  if (chosen === answer) return CHEERS[Math.floor(random() * CHEERS.length)] ?? 'נכון!';
  return lookAlikes(answer).includes(chosen) ? 'כמעט – הם באמת דומים.' : 'לא הפעם.';
}

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
  line: 'בלעדיו אין מלך. עוד סבב?',
};

/** The ranks of the trope hierarchy, highest first. */
export const RANKS: readonly Rank[] = [
  { min: 1, name: 'קֵיסָר', anchor: 'emperors', line: 'סוף פסוק לטעויות!' },
  { min: 0.8, name: 'מֶלֶךְ', anchor: 'kings', line: 'עוד קצת, והכתר של הקיסר שלכם.' },
  { min: 0.6, name: 'מִשְׁנֶה', anchor: 'dukes', line: 'משנה למלך: המלוכה כבר קרובה.' },
  { min: 0.4, name: 'שָׁלִישׁ', anchor: 'counts', line: 'עולים במדרג. עוד סבב?' },
  LOWEST,
];

/** The rank a round's score earns (Arye, 2026-11-06): out of ten, 10 קיסר down to 0–3 משרת. */
export const rankOf = (score: number, size: number): Rank =>
  RANKS.find((rank) => score >= rank.min * size) ?? LOWEST;

/**
 * What the site's quizzes share (src/components/Quiz.tsx): a word from the Torah and four names
 * to choose from (or a few fixed ones). Questions are drawn at random from a word list that scripts/quiz/build-word-list.ts
 * makes from the Torah (public/quiz/), plus, for some quizzes, a few prepared ones for the rare
 * answers and the tricky pairs. What a quiz asks about (its answers and which of them look alike)
 * is its QuizKind: the trope quiz (trope-quiz.ts), the niqqud and vowel-class quizzes
 * (niqqud-quiz.ts).
 *
 * The wrong options start random and turn into look-alikes as the learner answers well (Arye,
 * 2026-11-05). Random options pair up too, so the odd one out doesn't give the answer away.
 */

/**
 * A word or maqaf chain from the Torah. `m`: the index of the chain's word to mark; `h`: the
 * start and end of the letters to mark (a letter and its vowel, in the niqqud quiz); `p`: its ׀
 * is a פסק, drawn hollow as elsewhere on the site, not the solid line of a מונח לגרמיה.
 */
export interface QuizItem {
  w: string;
  m?: number;
  h?: number[];
  p?: boolean;
}

/** A word list in public/quiz/: the words that show each answer. */
export interface WordList {
  source: string;
  license: string;
  items: Record<string, QuizItem[]>;
}

/**
 * A hand-made question: for an answer too rare to draw at random, or for telling look-alikes
 * apart, with its own wrong options (optional) and, for look-alikes, an explanation of the
 * difference. The rare ones have none: the sign itself is on the screen (Arye, 2026-11-08).
 */
export interface PreparedQuestion {
  answer: string;
  item: QuizItem;
  options?: string[];
  why?: string;
}

export interface Question extends PreparedQuestion {
  /** Identifies the question across rounds (the recently asked list). */
  key: string;
  /**
   * The word list's entry it was drawn from: its answer, unless the quiz asks about something
   * the entry belongs to (the vowel-class quiz: a קמץ is a long vowel).
   */
  group: string;
}

/** What a quiz asks about. */
export interface QuizKind {
  /** Every answer the quiz asks about and offers. */
  ids: readonly string[];
  /** Answers that look alike; one may be in several groups. */
  lookAlikes: readonly (readonly string[])[];
  /** Names that would also be right for what a question about the key shows: never offered. */
  alsoShown?: Readonly<Record<string, readonly string[]>>;
}

/** Answers with fewer words than this in the Torah are asked only in prepared questions. */
export const MIN_RANDOM = 20;
/** The highest level: all three wrong options look like the answer. */
export const MAX_LEVEL = 3;

export const lookAlikes = (kind: QuizKind, id: string): string[] =>
  [...new Set(kind.lookAlikes.filter((group) => group.includes(id)).flat())].filter(
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
  kind: QuizKind,
  answer: string,
  level: number,
  random: () => number = Math.random,
): string[] {
  const excluded = new Set([answer, ...(kind.alsoShown?.[answer] ?? [])]);
  const picked = [answer];
  const free = (id: string) => !excluded.has(id) && !picked.includes(id);
  for (const id of shuffle(lookAlikes(kind, answer), random).slice(0, level))
    if (free(id)) picked.push(id);
  for (const id of shuffle(kind.ids, random)) {
    if (picked.length === 4) break;
    if (!free(id)) continue;
    picked.push(id);
    const partner = shuffle(lookAlikes(kind, id), random).find(free);
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

/**
 * answer|word, the key the trope quiz has always stored, so its recently asked list carries over;
 * with |start-end when letters are marked, since one word may be asked about at several letters.
 */
const keyOf = (answer: string, item: QuizItem) =>
  item.h ? `${answer}|${item.w}|${item.h.join('-')}` : `${answer}|${item.w}`;

/** The time limits a learner can choose for each question, in seconds (Arye, 2026-11-10). */
export const TIME_LIMITS = [15, 10, 5] as const;

/** Answers too rare in the word list to draw at random: only prepared questions ask about them. */
const isRare = (list: WordList, id: string) => (list.items[id]?.length ?? 0) < MIN_RANDOM;

/**
 * A round: `preparedCount` prepared questions and the rest random, in random order, none asked
 * recently if that can be helped, and no group twice; as long as `size`, or as there are groups.
 * The groups are the word list's entries (`groups` of them, or all); a question's answer is its
 * group's (`answerOf`), or the group itself.
 */
export function buildRound(
  list: WordList,
  prepared: readonly PreparedQuestion[],
  recent: ReadonlySet<string>,
  {
    size = 10,
    preparedCount = 2,
    random = Math.random,
    groups = Object.keys(list.items),
    answerOf = (group: string) => group,
  }: {
    size?: number;
    preparedCount?: number;
    random?: () => number;
    groups?: readonly string[];
    answerOf?: (group: string) => string;
  } = {},
): Question[] {
  const round: Question[] = [];
  // Each group once a round (Arye, 2026-11-06: each trope once): a question from one already
  // asked is skipped; so is a word already shown (the niqqud quiz asks about several letters of
  // some words).
  const fresh = (candidates: Question[]) => {
    const unused = candidates.filter(
      (c) => !round.some((q) => q.group === c.group || q.item.w === c.item.w),
    );
    return unused.find((c) => !recent.has(c.key)) ?? unused[0];
  };
  const preparedQuestions = shuffle(
    prepared.map((p) => ({ ...p, group: p.answer, key: keyOf(p.answer, p.item) })),
    random,
  );
  for (let i = 0; i < preparedCount; i++) {
    const question = fresh(preparedQuestions);
    if (question) round.push(question);
  }
  const drawn = groups.filter((id) => !isRare(list, id));
  for (const group of shuffle(drawn, random)) {
    if (round.length === size) break;
    const answer = answerOf(group);
    const items = (list.items[group] ?? []).map((item) => ({
      answer,
      group,
      item,
      key: keyOf(answer, item),
    }));
    const question = fresh(shuffle(items, random));
    if (question) round.push(question);
  }
  return shuffle(round, random);
}

/** The cheers after a right answer, one at random so it doesn't repeat itself. */
export const CHEERS = ['נכון!', 'בדיוק!', 'יפה מאוד!', 'קלעתם!', 'מצוין!'];
/** After choosing a look-alike of the answer: a kinder word (Arye, 2026-11-08). */
export const NEAR_MISSES = ['כמעט – הם באמת דומים.', 'קרוב מאוד.', 'מבלבל, נכון?', 'ההבדל דק.'];
/** After any other mistake. */
export const MISSES = ['לא הפעם.', 'לא בדיוק.', 'הפעם לא.'];

const pick = (lines: readonly string[], random: () => number) =>
  lines[Math.floor(random() * lines.length)] ?? '';

/**
 * Ways to say how many right answers in a row; one per round, so the label doesn't change its
 * wording under the reader's eyes (Arye, 2026-11-08).
 */
export const STREAK_LABELS: readonly ((run: number) => string)[] = [
  (run) => `${run} נכונות ברצף`,
  (run) => `${run} ברצף`,
  (run) => `רצף של ${run}`,
  (run) => `${run} בלי טעות`,
  (run) => `${run} רצופות`,
];

/** A round's way of saying it, at random. */
export const pickStreakLabel = (random: () => number = Math.random) =>
  STREAK_LABELS[Math.floor(random() * STREAK_LABELS.length)] ?? ((run: number) => `${run} ברצף`);

/**
 * What a question whose time ran out counts as chosen (a timed quiz): no answer's id, and not
 * empty, which would read as no answer yet.
 */
export const TIME_UP = 'time-up';
/** The feedback when the time ran out. */
export const TIME_UP_LINE = 'נגמר הזמן.';

/**
 * What the feedback opens with: a cheer, or after a mistake a kinder word when the two answers
 * really are alike; each one of its kind at random.
 */
export function cheer(
  kind: QuizKind,
  answer: string,
  chosen: string,
  random: () => number = Math.random,
): string {
  if (chosen === TIME_UP) return TIME_UP_LINE;
  if (chosen === answer) return pick(CHEERS, random);
  return pick(lookAlikes(kind, answer).includes(chosen) ? NEAR_MISSES : MISSES, random);
}

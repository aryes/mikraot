/**
 * Finds the pairs of the Torah where a servant (משרת) comes right before the disjunctive (מפסיק)
 * it serves, for the servant quiz (src/lib/servant-quiz.ts). The servant's word is shown without
 * its sign, so the learner says which servant goes there.
 */
import type { QuizItem } from '../../src/lib/quiz';
import { DISJUNCTIVES, SERVANTS } from '../../src/lib/servant-quiz';
import { SIGNS, signsOf, tokens } from './torah-words';

/**
 * A servant seen fewer times than this before a disjunctive (different words) is an exception
 * there; one seen at least that often is never offered as a wrong option there.
 */
export const MIN_PAIR = 3;
/** A servant asked about before a disjunctive takes at least this share of its words. */
export const MIN_SHARE = 0.05;

const servants: readonly string[] = SERVANTS;
const disjunctives: readonly string[] = DISJUNCTIVES;

/** One pair as found in a verse: the servant, the disjunctive and the two words as shown. */
export interface Pair {
  servant: string;
  disjunctive: string;
  item: QuizItem;
}

/** A word without the marks of one trope (MAM may write a sign twice on a word). */
const without = (word: string, trope: string) =>
  word
    .split('')
    .filter((c) => SIGNS[c] !== trope)
    .join('');

/** The pairs in one verse of Sefaria's markup. */
export function versePairs(html: string): Pair[] {
  const list = tokens(html);
  const found: Pair[] = [];
  list.forEach((token, i) => {
    const next = list[i + 1];
    if (!next || token.unreadable || next.unreadable || token.line) return;
    const [servant = ''] = signsOf(token);
    const signs = signsOf(next);
    if (signsOf(token).size !== 1 || !servants.includes(servant) || signs.size !== 1) return;
    const [sign = ''] = signs;
    // A מונח with a לגרמיה line is a disjunctive of its own; a word with a פסק after it is left
    // out (its trope may be a servant).
    const disjunctive = next.line === 'legarmeh' && sign === 'מונח' ? 'מונח-לגרמיה' : sign;
    if (next.line === 'paseq' || !disjunctives.includes(disjunctive)) return;
    const first = without(token.text, servant);
    const second = next.line === 'legarmeh' ? `${next.text} ׀` : next.text;
    found.push({
      servant,
      disjunctive,
      item: { w: `${first} ${second}`, h: [0, first.length], a: servant, o: token.text },
    });
  });
  return found;
}

/**
 * The quiz items by disjunctive: only the pairs where the servant is common there (MIN_SHARE),
 * each naming the other servants seen there (MIN_PAIR, `x`), never offered as wrong; a
 * disjunctive with so many that fewer than three wrong options are left is left out. Pairs are
 * counted once for each different pair of words (a verse repeated elsewhere counts once).
 */
export function servantItems(pairs: readonly Pair[]): Map<string, QuizItem[]> {
  const words = new Map<string, Set<string>>();
  for (const { servant, disjunctive, item } of pairs) {
    const key = `${servant}>${disjunctive}`;
    words.set(key, (words.get(key) ?? new Set()).add(item.w));
  }
  const count = (servant: string, disjunctive: string) =>
    words.get(`${servant}>${disjunctive}`)?.size ?? 0;
  const total = (disjunctive: string) =>
    servants.reduce((sum, servant) => sum + count(servant, disjunctive), 0);
  const found = new Map<string, QuizItem[]>();
  for (const { servant, disjunctive, item } of pairs) {
    const right = servants.filter((other) => count(other, disjunctive) >= MIN_PAIR);
    const common = count(servant, disjunctive) >= MIN_SHARE * total(disjunctive);
    if (!right.includes(servant) || !common || servants.length - right.length < 3) continue;
    const items = found.get(disjunctive) ?? [];
    const others = right.filter((other) => other !== servant);
    if (!items.some((other) => other.w === item.w))
      items.push({ ...item, ...(others.length > 0 && { x: others }) });
    found.set(disjunctive, items);
  }
  return found;
}

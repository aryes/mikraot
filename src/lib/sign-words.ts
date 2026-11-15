/**
 * The sign quiz with words from the Torah as its answers (Arye, 2026-11-15: "a version with real
 * torah words in the answer"): each option a word carrying that trope, from the trope quiz's word
 * list (public/quiz/trope-words.json), chosen by a seed of the question's and the option: new
 * words each round, the same while a question is shown.
 */
import type { QuizKind } from './quiz';
import { SIGN_KIND, SIGNED_TROPES } from './trope-signs';

/**
 * Too rare in the Torah for the word list to hold enough of them (MIN_RANDOM). (מאילא too, but
 * it is not among the signs at all.)
 */
export const TOO_RARE: readonly string[] = ['שלשלת', 'קרני-פרה', 'מרכא-כפולה', 'ירח-בן-יומו'];

/** The tropes asked with words: those the word list has enough words for. */
export const WORD_TROPES: readonly string[] = SIGNED_TROPES.filter((id) => !TOO_RARE.includes(id));

/** Those tropes, with the look-alikes among them, for the options. */
export const WORD_SIGN_KIND: QuizKind = {
  ids: WORD_TROPES,
  lookAlikes: SIGN_KIND.lookAlikes
    .map((group) => group.filter((id: string) => WORD_TROPES.includes(id)))
    .filter((group) => group.length > 1),
};

/** One of `words`, the same each time for the same `seed` (FNV-1a, a small string hash). */
export function wordFor(words: readonly string[], seed: string): string | undefined {
  let hash = 0x811c9dc5;
  for (const char of seed) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return words[hash % words.length];
}

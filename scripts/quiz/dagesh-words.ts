/**
 * Finds the dageshes of the Torah that the rules of the site's pages "דגש קל" and "דגש חזק"
 * settle, for the dagesh quiz (src/lib/dagesh-quiz.ts): each a group by its rule, so the feedback
 * can say why. Words are shown without their cantillation (the meteg kept, as in the shva quiz).
 */
import type { QuizItem } from '../../src/lib/quiz';
import { THE_NAME } from './niqqud-words';
import {
  DAGESH,
  type Letter,
  lettersOf,
  QAMATS_QATAN,
  SHVA,
  sounded,
  shvaGroup,
  VOWEL,
} from './shva-words';
import { tokens } from './torah-words';

const BEGADKEFAT = 'בגדכפת';
/** A word without its cantillation and sof pasuq (the meteg kept). */
const withoutTropes = (text: string) => text.replace(/[֑-֯׃]/gu, '');

/**
 * Whether a word ends in a closed syllable: its last letter has no vowel and isn't a vowel letter
 * (א, ה, ו, י). After an open one, a בג״ד כפ״ת starting the next word may lose its dagesh, or take a
 * דחיק: the quiz doesn't ask there.
 */
function endsClosed(word: string): boolean {
  const last = lettersOf(word).at(-1);
  return !!last && !VOWEL.test(last.marks) && !'אהוי'.includes(last.letter);
}

/**
 * The rule that settles a letter's dagesh (DAGESH_REASONS in src/lib/dagesh-quiz.ts): a דגש קל
 * in a בג״ד כפ״ת starting a word after a closed syllable (or a verse), or after a שווא נח inside
 * a word (the shva quiz's נח: not starting a word, as in שְׁתַּיִם); a דגש חזק in a בג״ד כפ״ת
 * after a vowel, or in any other letter but a ו that is a שורוק and a word's last ה (a מפיק). None where the rules don't settle it: a word's last letter (אַתְּ),
 * a ו with a dagesh and no vowel, a letter after a vowel letter, and בָּתִּים (a דגש קל after what
 * looks like a long vowel).
 */
export function dageshGroup(
  letters: readonly Letter[],
  i: number,
  closedBefore: boolean,
): string | undefined {
  const letter = letters[i];
  if (!letter?.marks.includes(DAGESH) || i === letters.length - 1) return undefined;
  // A ו with a dagesh and no vowel of its own is a שורוק.
  if (letter.letter === 'ו' && !VOWEL.test(letter.marks) && !letter.marks.includes(SHVA)) {
    return undefined;
  }
  const begadkefat = BEGADKEFAT.includes(letter.letter);
  if (i === 0) return begadkefat && closedBefore ? 'קל-ראש' : undefined;
  const previous = letters[i - 1];
  // בָּתִּים, בָּתֵּי: the textbook exception, read with a קמץ קטן and a דגש קל.
  if (letter.letter === 'ת' && previous?.letter === 'ב' && previous.marks.includes('ָ')) {
    return undefined;
  }
  // After a shva the shva quiz calls נח (not one starting the word, or on a doubled letter).
  const shva = shvaGroup(letters, i - 1);
  if (shva) return begadkefat && shva.startsWith('נח') ? 'קל-שווא' : undefined;
  if (!previous || !sounded(previous)) return undefined;
  return begadkefat ? 'חזק-תנועה' : 'חזק-אות';
}

/**
 * The quiz items in one verse: each single word's dageshes the rules settle, one item per rule in
 * a word, the word without its cantillation (the meteg kept).
 */
export function verseDageshItems(html: string): { answer: string; item: QuizItem }[] {
  const words = tokens(html, { qatan: true });
  return words.flatMap((token, at) => {
    const word = withoutTropes(token.text);
    if (token.unreadable || word.includes('־') || THE_NAME.test(word)) return [];
    if (!/^[ְ-ׇּׁׂא-ת]+$/u.test(word)) return [];
    const previous = words[at - 1];
    const closedBefore = !previous || endsClosed(withoutTropes(previous.text));
    const letters = lettersOf(word);
    const found = new Map<string, QuizItem>();
    letters.forEach((letter, i) => {
      const group = dageshGroup(letters, i, closedBefore);
      if (group && !found.has(group)) found.set(group, { w: word, h: [letter.start, letter.end] });
    });
    // As the site writes it: a qamats qatan as a qamats.
    return [...found].map(([answer, item]) => ({
      answer,
      item: { ...item, w: item.w.replaceAll(QAMATS_QATAN, 'ָ') },
    }));
  });
}

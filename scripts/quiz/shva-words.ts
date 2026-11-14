/**
 * Finds the shvas of the Torah that the rules of the site's page "שווא נע" settle, for the shva
 * quiz (src/lib/shva-quiz.ts): each a group by the rule, so the feedback can say why. Words are
 * shown as written but without their cantillation; the meteg stays, since a קמץ with one before a
 * shva is a קמץ גדול (and the shva נע), without one a קמץ קטן.
 */
import type { QuizItem } from '../../src/lib/quiz';
import { THE_NAME } from './niqqud-words';
import { tokens } from './torah-words';

export const SHVA = 'ְ';
export const DAGESH = 'ּ';
const METEG = 'ֽ';
const HIRIQ = 'ִ';
export const QAMATS_QATAN = 'ׇ';
/** The long vowels of the niqqud table, a חיריק and a שורוק apart (they depend on a letter). */
const LONG = new Set(['ָ', 'ֵ', 'ֹ', 'ֺ']);
/** The short ones, the קמץ קטן among them. */
const SHORT = new Set(['ַ', 'ֶ', 'ֻ', HIRIQ, QAMATS_QATAN]);
/** A vowel sign other than the shva, the קמץ קטן's included (U+05B1-05BB, U+05C7). */
export const VOWEL = new RegExp(
  `[${String.fromCodePoint(0x5b1)}-${String.fromCodePoint(0x5bb)}${QAMATS_QATAN}]`,
  'u',
);
/** The final forms, as their letters: ךְ and כ are the same letter. */
const FINAL: Readonly<Record<string, string>> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

export interface Letter {
  letter: string;
  marks: string;
  start: number;
  end: number;
}

export function lettersOf(word: string): Letter[] {
  const found: Letter[] = [];
  word.split('').forEach((c, at) => {
    if (/[א-ת]/u.test(c)) found.push({ letter: c, marks: '', start: at, end: at + 1 });
    else {
      const last = found.at(-1);
      if (last) {
        last.marks += c;
        last.end = at + 1;
      }
    }
  });
  return found;
}

const base = (letter: string) => FINAL[letter] ?? letter;
/** A letter with no vowel and no dagesh: a vowel letter (י of a חיריק מלא, א, ה) or a silent one. */
const bare = (l: Letter | undefined) => !!l && !VOWEL.test(l.marks) && !l.marks.includes(SHVA);
/** A letter read with a vowel: its own, or a ו that is a שורוק. */
export const sounded = (l: Letter) =>
  VOWEL.test(l.marks) || (l.letter === 'ו' && l.marks.includes(DAGESH));

/**
 * The vowel before a letter, long or short, with whether it has a meteg; undefined where it can't
 * be told: no vowel before, or a ו that starts the word (ו החיבור, whose shva the page calls נח).
 */
function vowelBefore(
  letters: readonly Letter[],
  i: number,
): { long: boolean; meteg: boolean; qamats?: boolean } | undefined {
  let j = i - 1;
  let previous = letters[j];
  if (!previous) return undefined;
  // A שורוק or a חולם מלא: the ו carries the vowel.
  if (previous.letter === 'ו' && previous.marks.replace(METEG, '') === DAGESH) {
    return j === 0 ? undefined : { long: true, meteg: previous.marks.includes(METEG) };
  }
  if (
    previous.letter === 'ו' &&
    previous.marks.replace(METEG, '') === 'ֹ' &&
    bare(letters[j - 1])
  ) {
    return { long: true, meteg: previous.marks.includes(METEG) };
  }
  // A silent letter after a vowel (צֵאתְךָ, the י of a חיריק מלא): the vowel before it.
  if (bare(previous) && 'איה'.includes(previous.letter)) {
    const letter = previous.letter;
    j -= 1;
    previous = letters[j];
    if (!previous) return undefined;
    if (letter === 'י' && previous.marks.includes(HIRIQ)) {
      return { long: true, meteg: previous.marks.includes(METEG) };
    }
  }
  const vowel = previous.marks.split('').find((mark) => LONG.has(mark) || SHORT.has(mark));
  if (!vowel) return undefined;
  return { long: LONG.has(vowel), meteg: previous.marks.includes(METEG), qamats: vowel === 'ָ' };
}

/**
 * The rule of the page "שווא נע" that settles a letter's shva (SHVA_REASONS in
 * src/lib/shva-quiz.ts), in the page's order (אבגד״ה), then the shva נח: after a short vowel, or
 * on the word's last letter. None where the page's rules don't settle it: a short vowel with a
 * meteg before it (וַֽיְהִי, read נע by many), a קמץ גדול without one (הָיְתָה, read נח by many),
 * the shva after a ו החיבור (the page's exception),
 * the last letters' two shvas (וַיֵּשְׁתְּ), and a letter after a חטף.
 */
export function shvaGroup(letters: readonly Letter[], i: number): string | undefined {
  const letter = letters[i];
  if (!letter || !letter.marks.includes(SHVA) || VOWEL.test(letter.marks)) return undefined;
  const last = i === letters.length - 1;
  if (last) return 'נח-סוף';
  // Only shvas (or nothing) after it, to the end of the word: both silent, not the page's rules.
  if (letters.slice(i + 1).every((l) => !sounded(l))) return undefined;
  if (i === 0) return 'נע-ראש';
  if (letters[i - 1]?.marks.includes(SHVA)) return 'נע-שני';
  // A dagesh on a letter with a shva doubles it (מְצַוְּךָ: a ו too, not a שורוק).
  if (letter.marks.includes(DAGESH)) return 'נע-דגש';
  if (base(letter.letter) === base(letters[i + 1]?.letter ?? '')) return 'נע-דומות';
  const before = vowelBefore(letters, i);
  if (!before) return undefined;
  // A קמץ גדול with no meteg before a shva closes its syllable in this text (הָיְתָה): read נח by
  // many, so not asked.
  if (before.long) return before.qamats && !before.meteg ? undefined : 'נע-גדולה';
  return before.meteg ? undefined : 'נח-קטנה';
}

/**
 * The quiz items in one verse: each single word's shvas the page's rules settle, one item per
 * rule in a word, the word without its cantillation (the meteg kept).
 */
export function verseShvaItems(html: string): { answer: string; item: QuizItem }[] {
  return tokens(html, { qatan: true })
    .filter((token) => !token.unreadable && !token.text.includes('־'))
    .map((token) => token.text.replace(/[֑-֯׃]/gu, ''))
    .filter((word) => !THE_NAME.test(word) && /^[ְ-ׇּׁׂא-ת]+$/u.test(word))
    .flatMap((word) => {
      const letters = lettersOf(word);
      const found = new Map<string, QuizItem>();
      letters.forEach((letter, i) => {
        const group = shvaGroup(letters, i);
        if (group && !found.has(group))
          found.set(group, { w: word, h: [letter.start, letter.end] });
      });
      // As the site writes it: a qamats qatan as a qamats.
      return [...found].map(([answer, item]) => ({
        answer,
        item: { ...item, w: item.w.replaceAll(QAMATS_QATAN, 'ָ') },
      }));
    });
}

/**
 * Finds the letters of the Torah whose niqqud can be named from what is shown, for the niqqud quiz
 * (src/lib/niqqud-quiz.ts). Words are shown without their cantillation marks and meteg, one letter
 * marked: with its vowel letter for a חיריק מלא, a חולם מלא or a שורוק (the consonant before the
 * ו, which carries the vowel, with it).
 */
import type { QuizItem } from '../../src/lib/quiz';
import { tokens } from './torah-words';

/** A letter and the marks on it, with its place in the word. */
interface Cluster {
  letter: string;
  marks: string[];
  start: number;
  end: number;
}

const DAGESH = 'ּ';
const HOLAM = 'ֹ';
const HOLAM_HASER_FOR_VAV = 'ֺ';
const QAMATS_QATAN = 'ׇ';

/** Each vowel sign's name in the quiz; a חיריק and a חולם depend on the letter after. */
const VOWELS: Readonly<Record<string, string>> = {
  'ְ': 'שווא',
  'ֱ': 'חטף-סגול',
  'ֲ': 'חטף-פתח',
  'ֳ': 'חטף-קמץ',
  'ִ': 'חיריק-חסר',
  'ֵ': 'צירה',
  'ֶ': 'סגול',
  'ַ': 'פתח',
  'ָ': 'קמץ',
  [HOLAM]: 'חולם-חסר',
  [HOLAM_HASER_FOR_VAV]: 'חולם-חסר',
  'ֻ': 'קבוץ',
};

/** A word without its cantillation, meteg and sof pasuq: only letters and niqqud are left. */
export const withoutTeamim = (word: string) => word.replace(/[֑-ֽ֯׃]/g, '');

function clusters(word: string): Cluster[] {
  const found: Cluster[] = [];
  // Hebrew letters and marks are each one UTF-16 unit, so these places are the string's.
  word.split('').forEach((c, at) => {
    if (/[א-ת]/.test(c)) found.push({ letter: c, marks: [], start: at, end: at + 1 });
    else {
      const last = found.at(-1);
      if (last) {
        last.marks.push(c);
        last.end = at + 1;
      }
    }
  });
  return found;
}

const vowelsOf = (cluster: Cluster | undefined) =>
  cluster?.marks.filter((mark) => mark in VOWELS || mark === QAMATS_QATAN) ?? [];

/**
 * The niqqud shown in one word, each named once, with the letters to mark. Left out: a letter
 * with two vowels or a קמץ קטן (whose sign is a קמץ's), and a ו whose vowel can't be told from
 * what is written (a dagesh or a dot after a letter with a vowel of its own).
 */
export function wordItems(word: string): { answer: string; item: QuizItem }[] {
  const letters = clusters(word);
  const found = new Map<string, QuizItem>();
  const add = (answer: string, from: Cluster, to: Cluster) => {
    if (!found.has(answer)) found.set(answer, { w: word, h: [from.start, to.end] });
  };
  letters.forEach((letter, i) => {
    const previous = letters[i - 1];
    const next = letters[i + 1];
    const vowels = vowelsOf(letter);
    const bare = (cluster: Cluster | undefined) => vowelsOf(cluster).length === 0;
    if (letter.letter === 'ו' && (vowels.length === 0 || vowels[0] === HOLAM)) {
      const shuruq = vowels.length === 0 && letter.marks.join('') === DAGESH;
      const holam = vowels.length === 1 && letter.marks.join('') === HOLAM;
      // A vowel letter: the vowel of the consonant before, which has none of its own; a שורוק
      // may also start a word (וּ, "and").
      if (shuruq && (!previous || bare(previous))) add('שורוק', previous ?? letter, letter);
      else if (holam && previous && bare(previous)) add('חולם-מלא', previous, letter);
      // A consonant ו with a חולם: after a vowel (מִצְוֹת), or at the start of a word.
      else if (holam) add('חולם-חסר', letter, letter);
      return;
    }
    if (vowels.length !== 1) return;
    const [vowel = ''] = vowels;
    if (vowel === QAMATS_QATAN) return;
    const name = VOWELS[vowel];
    if (!name) return;
    // A י with no mark after a חיריק is its vowel letter.
    if (name === 'חיריק-חסר' && next?.letter === 'י' && next.marks.length === 0)
      add('חיריק-מלא', letter, next);
    else add(name, letter, letter);
  });
  return [...found].map(([answer, item]) => ({ answer, item }));
}

/**
 * The divine name, its letters with any marks between them: its vowels are those of another word
 * (אֲדֹנָי, אֱלֹהִים), read in its place, so it isn't asked about.
 */
const THE_NAME = /י[^א-ת]*ה[^א-ת]*ו[^א-ת]*ה/;

/** The quiz items in one verse of Sefaria's markup: single words, read as written. */
export function verseNiqqudItems(html: string): { answer: string; item: QuizItem }[] {
  return tokens(html, { qatan: true })
    .filter((token) => !token.unreadable && !token.text.includes('־'))
    .map((token) => withoutTeamim(token.text))
    .filter((word) => !THE_NAME.test(word))
    .filter((word) => /^[ְ-ׇּׁׂא-ת]+$/.test(word))
    .flatMap((word) => {
      const items = wordItems(word);
      // The word as the site writes it: its qamats qatan, never asked, as a qamats.
      return items.map(({ answer, item }) => ({
        answer,
        item: { ...item, w: item.w.replaceAll(QAMATS_QATAN, 'ָ') },
      }));
    });
}

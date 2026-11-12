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
 * with two vowels, and a ו whose vowel can't be told from
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
    // Kept apart: the niqqud quiz can't ask about it (its sign is a קמץ's), the vowel-class quiz
    // can (a short vowel).
    if (vowel === QAMATS_QATAN) {
      add('קמץ-קטן', letter, letter);
      return;
    }
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
      // The word as the site writes it: a qamats qatan as a qamats.
      return items.map(({ answer, item }) => ({
        answer,
        item: { ...item, w: item.w.replaceAll(QAMATS_QATAN, 'ָ') },
      }));
    });
}

/** A character class of these code point ranges, written by number so it stays readable. */
const charClass = (ranges: readonly [number, number][]) =>
  `[${ranges.map(([from, to]) => `${String.fromCodePoint(from)}-${String.fromCodePoint(to)}`).join('')}]`;

/**
 * A word the qamats quiz shows: letters, cantillation (U+0591-05AF), vowels, dagesh and meteg
 * (U+05B0-05BD), the shin and sin dots (U+05C1-05C2) and the qamats qatan (U+05C7); nothing else
 * (no paseq or other rare marks), and maqafs (U+05BE) between words.
 */
const QAMATS_WORD = new RegExp(
  `^${charClass([
    [0x591, 0x5bd],
    [0x5be, 0x5be],
    [0x5c1, 0x5c2],
    [0x5c7, 0x5c7],
    [0x5d0, 0x5ea],
  ])}+$`,
  'u',
);
const STRESS = new RegExp(
  charClass([
    [0x591, 0x5af],
    [0x5bd, 0x5bd],
  ]),
  'u',
);
const SHVA = String.fromCodePoint(0x5b0);
const HATAF_QAMATS = String.fromCodePoint(0x5b3);

/**
 * Whether the site's rules (the page "קמץ קטן") explain an item's kind from what is shown: a
 * קמץ קטן never with a meteg or a trope on it, nor before a חטף קמץ (which the page doesn't
 * teach); a קמץ גדול never in what looks like a closed syllable, before a shva with neither a
 * meteg nor a trope on the qamats. The rest (about one in eight קמץ קטן) would mark a learner
 * wrong for following the page.
 */
function ruleExplains(kind: string, item: QuizItem): boolean {
  const [start = 0, end = 0] = item.h ?? [];
  const marked = item.w.slice(start, end);
  const next = item.w.slice(end).match(/^.[^\u05D0-\u05EA]*/u)?.[0] ?? '';
  const stressed = STRESS.test(marked);
  if (kind === 'קמץ-קטן') return !stressed && !next.includes(HATAF_QAMATS);
  return stressed || !next.includes(SHVA);
}

/**
 * The qamats quiz's items in one verse (src/lib/niqqud-quiz.ts, QAMATS_QUIZ): each word's or maqaf
 * chain's first qamats of each kind, the word as written, cantillation and meteg kept, since they
 * show where the stress is; only those the site's rules explain (ruleExplains).
 */
export function verseQamatsItems(html: string): { answer: string; item: QuizItem }[] {
  const kinds: Readonly<Record<string, string>> = { קמץ: 'קמץ-גדול', 'קמץ-קטן': 'קמץ-קטן' };
  return tokens(html, { qatan: true })
    .filter((token) => !token.unreadable && !THE_NAME.test(token.text))
    .map((token) => token.text.replace(String.fromCodePoint(0x5c3), ''))
    .filter((word) => QAMATS_WORD.test(word))
    .flatMap((word) =>
      wordItems(word).flatMap(({ answer, item }) => {
        const kind = kinds[answer];
        if (!kind || !ruleExplains(kind, item)) return [];
        // As the site writes it: a qamats qatan as a qamats (what the learner has to tell apart).
        const w = item.w.replaceAll(QAMATS_QATAN, String.fromCodePoint(0x5b8));
        return [{ answer: kind, item: { ...item, w } }];
      }),
    );
}

/**
 * The marked word of a maqaf chain, with its marked letters: the qamats quiz's כָּל־ before a
 * hundred different words is one question, not a hundred.
 */
export const markedWord = (item: QuizItem): string => {
  const [start = 0, end = 0] = item.h ?? [];
  const before = item.w.slice(0, start).split('־').at(-1) ?? '';
  const after = item.w.slice(end).split('־')[0] ?? '';
  return `${before}[${item.w.slice(start, end)}]${after}`;
};

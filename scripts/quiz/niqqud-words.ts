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
const CANTILLATION = new RegExp(charClass([[0x591, 0x5af]]), 'gu');
const HATAF_QAMATS = String.fromCodePoint(0x5b3);

const PATAH = String.fromCodePoint(0x5b7);
const QAMATS = String.fromCodePoint(0x5b8);
const MAQAF = String.fromCodePoint(0x5be);
/** A vowel, the qamats qatan's sign included; the shva apart (a final ךְ has one). */
const VOWEL = new RegExp(
  charClass([
    [0x5b1, 0x5bb],
    [0x5c7, 0x5c7],
  ]),
  'u',
);
const LETTER = charClass([[0x5d0, 0x5ea]]);
const NOT_LETTER = `[^${LETTER.slice(1)}`;

/** The letters of a text, each with its marks. */
const letters = (text: string): string[] =>
  text.match(new RegExp(`${LETTER}${NOT_LETTER}*`, 'gu')) ?? [];

/**
 * The rule of the page "קמץ קטן" that makes a קמץ קטן one, from what is shown (QATAN_REASONS in
 * src/lib/niqqud-quiz.ts): before a maqaf as its word's last vowel; the second of two qamats after
 * a וַ; before a dagesh (a strong one: after a vowel in the word); before a shva. None when the
 * page's rules don't explain it: a meteg or a trope on it (they mark a קמץ גדול), or a חטף קמץ
 * after it, which the page doesn't teach (about one in eight; Arye, 2026-11-14: perhaps later). A
 * קמץ גדול is kept unless it looks closed: before a shva with neither a meteg nor a trope on it.
 * The rest would mark a learner wrong for following the page.
 */
export function qamatsGroup(kind: string, item: QuizItem): string | undefined {
  const [start = 0, end = 0] = item.h ?? [];
  const marked = item.w.slice(start, end);
  const after = item.w.slice(end);
  const next = letters(after)[0] ?? '';
  const stressed = STRESS.test(marked);
  if (kind !== 'קמץ-קטן') return stressed || !next.includes(SHVA) ? kind : undefined;
  if (stressed || next.includes(HATAF_QAMATS)) return undefined;
  const [rest = '', ...chained] = after.split(MAQAF);
  if (chained.length > 0 && !VOWEL.test(rest)) return 'קטן-מקף';
  const before = letters(item.w.slice(0, start).split(MAQAF).at(-1) ?? '');
  const [vav = '', second = ''] = before;
  if (
    before.length === 2 &&
    vav.startsWith('ו') &&
    vav.includes(PATAH) &&
    second.includes(QAMATS) &&
    !VOWEL.test(rest)
  ) {
    return 'קטן-נחים';
  }
  // A ו with a dagesh and no vowel is a שורוק, and a word's last ה with one has a מפיק: neither
  // is a doubled letter.
  const shuruq = next.startsWith('ו') && !VOWEL.test(next) && !next.includes(SHVA);
  const mappiq = next.startsWith('ה') && letters(rest).length === 1;
  if (next.includes(DAGESH) && !shuruq && !mappiq) return 'קטן-דגש';
  if (next.includes(SHVA)) return 'קטן-שווא';
  return undefined;
}

/**
 * The qamats quiz's items in one verse (src/lib/niqqud-quiz.ts, QAMATS_QUIZ): each word's or maqaf
 * chain's first qamats of each kind, the word as written, cantillation and meteg kept, since they
 * show where the stress is; only those the site's rules explain, by the rule (qamatsGroup).
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
        const group = kind && qamatsGroup(kind, item);
        if (!group) return [];
        // As the site writes it: a qamats qatan as a qamats (what the learner has to tell apart).
        const w = item.w.replaceAll(QAMATS_QATAN, String.fromCodePoint(0x5b8));
        return [{ answer: group, item: { ...item, w } }];
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
  // The same word under another trope is the same question.
  return `${before}[${item.w.slice(start, end)}]${after}`.replace(CANTILLATION, '');
};

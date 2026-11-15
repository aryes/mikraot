/**
 * The sound quiz ("איך זה נשמע?", src/components/SoundQuiz.tsx; Arye's idea, in the roadmap since
 * 2026-11-14): a letter with a vowel; which of the letter's recorded syllables is it? The
 * recordings are the מבטא page's, one for each letter (with and without its dagesh where that
 * changes its sound), each saying the letter with five vowels: a, e, i, o, u, in that order (Arye,
 * 2026-11-15). Vowels that sound alike share a sound: קמץ, פתח and חטף פתח are all "a". Not the
 * קמץ קטן (it looks like a קמץ) or the שווא (נע or נח). Its list, public/quiz/sound-letters.json,
 * is made by `npm run quiz:sounds` (scripts/quiz/sound-letters.ts).
 */
import type { QuizKind } from './quiz';

/** The five sounds, in the order each recording says them. */
export const SOUNDS = ['a', 'e', 'i', 'o', 'u'] as const;
export type Sound = (typeof SOUNDS)[number];

export const SOUND_QUIZ: QuizKind = { ids: SOUNDS, lookAlikes: [] };

/** The page whose recordings the quiz plays, which the feedback links to. */
export const SOUND_PAGE = '/מבטא/';

const QAMATS = 'ָ';
const PATAH = 'ַ';
const HATAF_PATAH = 'ֲ';
const TSERE = 'ֵ';
const SEGOL = 'ֶ';
const HATAF_SEGOL = 'ֱ';
const HIRIQ = 'ִ';
const HOLAM = 'ֹ';
const HATAF_QAMATS = 'ֳ';
const QUBUTS = 'ֻ';
const SHURUQ = 'וּ';
const YOD = 'י';
const VAV = 'ו';

/** The letters a חטף vowel is written under (the gutturals; ר never takes one). */
const GUTTURALS = new Set(['א', 'ה', 'ח', 'ע']);

/**
 * Each way a letter (with its dagesh or shin dot, if any) is written with each sound: the vowel
 * under it, and the full forms with a vowel letter (חיריק, חולם and שורוק מלא); the חטפים only
 * under a guttural.
 */
export function soundForms(letter: string): Record<Sound, string[]> {
  const base = letter.normalize('NFC');
  const bare = base.charAt(0);
  const with_ = (vowel: string) => (base + vowel).normalize('NFC');
  const guttural = GUTTURALS.has(bare);
  const vav = bare === 'ו';
  return {
    a: [with_(QAMATS), with_(PATAH), ...(guttural ? [with_(HATAF_PATAH)] : [])],
    e: [with_(TSERE), with_(SEGOL), ...(guttural ? [with_(HATAF_SEGOL)] : [])],
    i: [with_(HIRIQ), with_(HIRIQ) + YOD],
    // A ו with a חולם or a שורוק alone (וֹ, וּ) reads as the vowel without the ו: it takes them
    // as a vowel letter after it (ווֹ, ווּ).
    o: vav
      ? [base + VAV + HOLAM]
      : [with_(HOLAM), base + VAV + HOLAM, ...(guttural ? [with_(HATAF_QAMATS)] : [])],
    u: vav ? [base + SHURUQ] : [with_(QUBUTS), base + SHURUQ],
  };
}

/**
 * An option's name, by its place: a sound is heard, not read (named "a" or "קמץ", the learner
 * wouldn't need to listen). The options are in a new order for each question.
 */
export const soundLabel = (index: number) => `צליל ${index + 1}`;

/** A recording's five syllables, each as [start, end] in seconds, to play by itself. */
export type SyllableTimes = readonly (readonly [number, number])[];

const DAGESH = 'ּ';
const SHIN_DOT = 'ׁ';
/** The letters whose sound changes with a dagesh: a recording with it and one without. */
const BEGADKEFAT = 'בגדכפת';

/** Where the מבטא page's recordings are, each named after its letter ("ב-דגושה"). */
export const RECORDINGS_DIR = '/wp-content/uploads/2021/09/';

/**
 * The recordings, by name, each with its letter as the quiz writes it: ב with and without its
 * dagesh, ש with its shin dot (the page's ש is a שׁ; its ס stands for a שׂ as well).
 */
export const RECORDINGS: Readonly<Record<string, string>> = Object.fromEntries(
  Array.from('אבגדהוזחטיכלמנסעפצקרשת').flatMap((letter) =>
    BEGADKEFAT.includes(letter)
      ? [
          [`${letter}-דגושה`, letter + DAGESH],
          [`${letter}-רפויה`, letter],
        ]
      : [[letter, letter === 'ש' ? letter + SHIN_DOT : letter]],
  ),
);

/**
 * The recording a written syllable comes from: its first letter, with the dagesh if that letter
 * has two recordings (a שורוק's dot, on the ו after it, is not the letter's dagesh).
 */
export function recordingOf(word: string): string | undefined {
  const first = /^\p{Letter}\p{Mark}*/u.exec(word.normalize('NFC'))?.[0] ?? '';
  const letter = first.charAt(0);
  if (!letter) return undefined;
  const name = BEGADKEFAT.includes(letter)
    ? `${letter}-${first.includes(DAGESH) ? 'דגושה' : 'רפויה'}`
    : letter;
  return name in RECORDINGS ? name : undefined;
}

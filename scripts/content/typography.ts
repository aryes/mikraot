/**
 * Hebrew typography for imported text: the content was typed with ASCII ' " and -.
 * - geresh ׳ after a Hebrew letter (ו׳, הא׳, ג׳)
 * - gershayim ״ between Hebrew letters (תנ״ך, רש״י)
 * - en dash – for a spaced hyphen (a – b)
 * Quotation marks around phrases stay as typed: straight quotes are standard in Hebrew text.
 */

/** A Hebrew letter, with any niqqud or cantillation marks after it. */
const LETTER = '[א-ת][֑-ׇ]*';

export function hebrewTypography(text: string): string {
  return text
    .replace(new RegExp(`(${LETTER})['’]`, 'g'), '$1׳')
    .replace(new RegExp(`(${LETTER})["”](?=[א-ת])`, 'g'), '$1״')
    .replace(/(\S) - (?=\S)/g, '$1 – ');
}

/** Folds typographic variants together, for comparing text across the change. */
export const plainTypography = (text: string) =>
  text.replace(/[’‘׳]/g, "'").replace(/[”“״]/g, '"').replace(/–/g, '-');

/**
 * Pointed (vocalised) Hebrew: words carrying niqqud or cantillation marks. Such text (the biblical
 * examples) is set in the biblical-text font, while plain explanatory Hebrew stays in the interface
 * font. There is no ready-made library for this; it is a small text scan.
 */

/** A niqqud or cantillation mark (not the punctuation in the same block: maqaf, paseq, sof pasuq). */
const MARK = /[֑-ׇֽֿׁׂׅׄ]/;
/** A Hebrew word: letters, marks and in-word punctuation (maqaf, sof pasuq, presentation forms). */
const WORD = /[א-ת֑-ׇיִ-ﭏ]+/g;
/** What may sit between two pointed words of one run (spaces, a hyphen used as maqaf). */
const GAP = /^[\s -]*$/;

/** Ranges `[start, end)` of pointed text: pointed words, joined across plain gaps between them. */
export function pointedRanges(text: string): [number, number][] {
  const ranges: [number, number][] = [];
  for (const match of text.matchAll(WORD)) {
    if (!MARK.test(match[0])) continue;
    const start = match.index;
    const end = start + match[0].length;
    const last = ranges.at(-1);
    if (last && GAP.test(text.slice(last[1], start))) last[1] = end;
    else ranges.push([start, end]);
  }
  return ranges;
}

export interface Part {
  text: string;
  pointed: boolean;
}

/**
 * Splits text into plain and pointed parts. `ranges` are positions in a longer text that `text`
 * starts at `offset` in, so that a word split across elements (a coloured letter) is judged whole.
 */
export function splitPointed(
  text: string,
  ranges: [number, number][] = pointedRanges(text),
  offset = 0,
): Part[] {
  const parts: Part[] = [];
  let at = 0;
  for (const [start, end] of ranges) {
    const from = Math.max(start - offset, at);
    const to = Math.min(end - offset, text.length);
    if (to <= from) continue;
    if (from > at) parts.push({ text: text.slice(at, from), pointed: false });
    parts.push({ text: text.slice(from, to), pointed: true });
    at = to;
  }
  if (at < text.length) parts.push({ text: text.slice(at), pointed: false });
  return parts;
}

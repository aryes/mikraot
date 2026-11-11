/**
 * Finds the words of the Torah that show one trope each, for the trope quiz (src/lib/trope-quiz.ts).
 * The input is Sefaria's text of Miqra according to the Masorah (MAM), with its markup: MAM tells
 * a לגרמיה line (<b>׀</b>) from a paseq (<small>׀</small>) and writes some signs twice (a sign on
 * an unstressed syllable gets a second copy on the stressed one).
 */
import type { QuizItem } from '../../src/lib/quiz';

/** A word as written, or a whole maqaf chain, with what follows it. */
interface Token {
  text: string;
  /** The verse's last word: its meteg is the סילוק of סוף פסוק. */
  last: boolean;
  /** A line after the word: לגרמיה, or a paseq. */
  line?: 'legarmeh' | 'paseq';
  /** Inside a ketiv/qere, whose reading differs from its writing: never asked. */
  unreadable: boolean;
}

export const SIGNS: Readonly<Record<string, string>> = {
  '\u0591': 'אתנחתא',
  '\u0592': 'סגול',
  '\u0593': 'שלשלת',
  '\u0594': 'זקף-קטן',
  '\u0595': 'זקף-גדול',
  '\u0596': 'טפחא',
  '\u0597': 'רביעי',
  '\u0598': 'זרקא',
  '\u0599': 'פשטא',
  '\u059A': 'יתיב',
  '\u059B': 'תביר',
  '\u059C': 'גרש',
  '\u059E': 'גרשיים',
  '\u059F': 'קרני-פרה',
  '\u05A0': 'תלישא-גדולה',
  '\u05A1': 'פזר',
  '\u05A3': 'מונח',
  '\u05A4': 'מהפך',
  '\u05A5': 'מרכא',
  '\u05A6': 'מרכא-כפולה',
  '\u05A7': 'דרגא',
  '\u05A8': 'קדמא',
  '\u05A9': 'תלישא-קטנה',
  '\u05AA': 'ירח-בן-יומו',
  '\u05AE': 'זרקא',
};
const METEG = '\u05BD';
const LINE = '׀';
/** Placeholders for what the markup tells (private-use characters, never in the text). */
const KETIV = '\uE000';
const LEGARMEH = '\uE001';
const PASEQ = '\uE002';

/** The verses of the Ten Commandments, which carry two sets of tropes at once. */
const TWO_SETS = [/^Exodus 20:([1-9]|1[0-7])$/, /^Deuteronomy 5:([6-9]|1\d|2[01])$/];
export const hasTwoSets = (ref: string) => TWO_SETS.some((re) => re.test(ref));

/**
 * One verse of Sefaria's markup as tokens. Footnotes and section marks go; big and small letters
 * stay as plain letters; a ketiv/qere is kept as a placeholder so the words around it keep their
 * places. The site writes qamats qatan as a qamats (kept with `qatan`: the niqqud quiz skips
 * it) and has no combining grapheme joiner.
 */
export function tokens(html: string, { qatan = false } = {}): Token[] {
  const text = html
    .replace(/<sup class="footnote-marker">.*?<\/sup><i class="footnote">.*?<\/i>/g, '')
    .replace(/<span class="mam-spi-[a-z]+">.*?<\/span>/g, '')
    .replace(/<span class="mam-kq">.*?<\/span><\/span>/g, ` ${KETIV} `)
    .replace(/<b>׀<\/b>/g, ` ${LEGARMEH} `)
    .replace(/<small>׀<\/small>/g, ` ${PASEQ} `)
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\u05C7/g, qatan ? '\u05C7' : '\u05B8')
    .replace(/\u034F/g, '');
  const out: Token[] = [];
  for (const piece of text.split(/\s+/).filter(Boolean)) {
    const previous = out.at(-1);
    if (piece === LEGARMEH && previous) previous.line = 'legarmeh';
    else if (piece === PASEQ && previous) previous.line = 'paseq';
    // A chain cut by a ketiv/qere leaves a word ending or starting in a maqaf. Rafe and the
    // dots over letters (puncta extraordinaria) are rare marks a learner would only stumble on.
    else {
      const unreadable =
        piece.includes(KETIV) ||
        piece.startsWith('־') ||
        piece.endsWith('־') ||
        /[\u05BF\u05C4\u05C5]/.test(piece);
      out.push({ text: piece, last: false, unreadable });
    }
  }
  const lastToken = out.at(-1);
  if (lastToken) lastToken.last = true;
  return out;
}

/** The trope ids in one word or chain, a sign written twice counted once (except פשטא, below). */
export function signsOf(token: Token): Set<string> {
  const found = new Set<string>();
  for (const word of token.text.split('־')) {
    // Two פשטא on one word are שני פשטין; any other doubled sign is MAM's reading aid.
    const pashta = word.match(/\u0599/g)?.length ?? 0;
    if (pashta === 2) found.add('שני-פשטין');
    for (const c of word) {
      const id = SIGNS[c];
      if (id && !(c === '\u0599' && pashta === 2)) found.add(id);
    }
  }
  if (token.last && token.text.includes(METEG)) found.add('סוף-פסוק');
  return found;
}

const same = (set: Set<string>, ...ids: string[]) =>
  set.size === ids.length && ids.every((id) => set.has(id));

/**
 * The quiz items in one verse: each word or chain whose trope can be named from what is shown.
 * Two words for קדמא ואזלא; the word and its line for מונח לגרמיה; a מאילא with the אתנח or
 * סוף פסוק of its chain, the word carrying it marked when the chain has more than one word.
 */
export function verseItems(html: string): { answer: string; item: QuizItem }[] {
  const list = tokens(html);
  const signs = list.map(signsOf);
  const found: { answer: string; item: QuizItem }[] = [];
  list.forEach((token, i) => {
    const s = signs[i] ?? new Set<string>();
    const next = list[i + 1];
    const nextSigns = signs[i + 1];
    if (token.unreadable || s.size === 0) return;
    if (token.line === 'paseq') return;
    if (token.line === 'legarmeh') {
      if (same(s, 'מונח'))
        found.push({ answer: 'מונח-לגרמיה', item: { w: `${token.text} ${LINE}` } });
      return;
    }
    if (s.has('טפחא') && (same(s, 'טפחא', 'אתנחתא') || same(s, 'טפחא', 'סוף-פסוק'))) {
      const words = token.text.split('־');
      const marked = words.findIndex((w) => w.includes('\u0596'));
      // The סילוק is on the chain's last word; an earlier meteg is only a meteg.
      const main = token.last ? words.length - 1 : words.findIndex((w) => w.includes('\u0591'));
      found.push({
        answer: 'מאילא',
        item: { w: token.text, ...(marked !== main && { m: marked }) },
      });
      return;
    }
    if (same(s, 'קדמא', 'זקף-קטן')) {
      found.push({ answer: 'קדמא-זקף-קטן', item: { w: token.text } });
      return;
    }
    // Any other word or chain with two signs is left out (a קדמא and its אזלא inside one chain
    // among them): a question shows one trope.
    if (s.size !== 1) return;
    const [trope = ''] = s;
    if (trope === 'קדמא' && next && !next.unreadable && nextSigns && same(nextSigns, 'גרש')) {
      if (!next.line)
        found.push({ answer: 'קדמא-ואזלא', item: { w: `${token.text} ${next.text}` } });
      return;
    }
    if (trope === 'גרש' && signs[i - 1] && same(signs[i - 1] ?? new Set(), 'קדמא')) return;
    found.push({ answer: trope, item: { w: token.text } });
  });
  return found;
}

/** Up to `max` items, spread evenly over the Torah rather than taken from its start. */
export function spread<T>(items: readonly T[], max: number): T[] {
  if (items.length <= max) return [...items];
  return items.filter(
    (_, i) => Math.floor((i * max) / items.length) !== Math.floor(((i - 1) * max) / items.length),
  );
}

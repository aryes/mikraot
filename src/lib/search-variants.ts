/**
 * Other forms of a search query, tried when it finds few pages. Pagefind has no Hebrew stemming
 * (https://pagefind.app/docs/multilingual), so it treats שוא and שווא, or דגש and הדגש, as unrelated
 * words, while the lessons write pointed words in defective spelling and prose in full spelling,
 * and Hebrew joins ו/ה/ב/ל/מ/ש/כ to the word. Kept small; the search-miss counts
 * (npm run search:misses) show which forms visitors actually type.
 */

/** Letters a word can start with as a prefix (ו, ה, ב, ל, מ, ש, כ). */
const PREFIXES = 'והבלמשכ';
/**
 * Core terms spelled two ways (defective and full), each pair both ways. A list rather than a rule:
 * collapsing every וו or יי turned שוואים into שואים, which matches unrelated pages.
 */
const SPELLINGS: readonly (readonly [string, string])[] = [
  ['שוא', 'שווא'],
  ['מצוה', 'מצווה'],
];
const OTHER_SPELLING = new Map(
  SPELLINGS.flatMap(
    ([a, b]) =>
      [
        [a, b],
        [b, a],
      ] as const,
  ),
);
/** Words that only frame the query ("פרשת שמיני": the pages say שמיני). */
const FRAMING = new Set(['פרשת', 'פרשה', 'ספר']);

/**
 * The forms of one word: itself, its other spelling, and (with `prefixes`) without one prefix
 * letter. Prefix removal also misfires (שמיני → מיני), so it is for queries that found nothing.
 */
export function wordForms(word: string, prefixes = true): string[] {
  const forms = new Set([word]);
  const add = (form: string) => {
    forms.add(form);
    const other = OTHER_SPELLING.get(form);
    if (other) forms.add(other);
  };
  add(word);
  // A prefix only on a word long enough to have one (דגש itself starts with ד; בית with ב).
  if (prefixes && word.length >= 4 && PREFIXES.includes(word.charAt(0))) add(word.slice(1));
  return [...forms].filter((form) => form.length >= 2);
}

/**
 * Other queries to try, most similar first, without the query itself: each word's other forms
 * (at most `limit` combinations), then, for several words, each word of 3+ letters alone.
 */
export function queryVariants(query: string, { prefixes = true, limit = 6 } = {}): string[] {
  // Typed quotes as the Hebrew marks (ו' → ו׳, תנ"ך → תנ״ך), as the search itself treats them, so
  // both spellings of a query get the same fallbacks.
  const marked = query.trim().replaceAll("'", '׳').replaceAll('"', '״');
  const words = marked.split(/\s+/).filter((word) => word && !FRAMING.has(word));
  if (words.length === 0) return [];
  let combos = [''];
  for (const word of words) {
    combos = combos.flatMap((start) =>
      wordForms(word, prefixes).map((form) => `${start} ${form}`.trim()),
    );
    combos = combos.slice(0, limit + 1);
  }
  // Alone, a short word (בר, נע) matches too much to help.
  const singles =
    words.length > 1
      ? words.flatMap((word) => wordForms(word, prefixes)).filter((form) => form.length >= 3)
      : [];
  return [...new Set([...combos, ...singles])].filter((variant) => variant !== marked);
}

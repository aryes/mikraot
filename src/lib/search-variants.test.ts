import { describe, expect, it } from 'vitest';
import { queryVariants, wordForms } from './search-variants';

describe('wordForms', () => {
  it('adds the full spelling of a core term written defectively, and the reverse', () => {
    expect(wordForms('שוא')).toEqual(['שוא', 'שווא']);
    expect(wordForms('שווא')).toContain('שוא');
  });

  it('adds the word without a prefix letter, with its other spellings', () => {
    expect(wordForms('הדגש')).toContain('דגש');
    expect(wordForms('בשווא')).toEqual(expect.arrayContaining(['שווא', 'שוא']));
  });

  it('keeps prefix letters when asked (a query that found something)', () => {
    expect(wordForms('שמיני', false)).toEqual(['שמיני']);
    expect(queryVariants('שוא', { prefixes: false })).toEqual(['שווא']);
    expect(queryVariants('בשוא', { prefixes: false })).toEqual([]);
  });

  it("leaves short words' first letter alone", () => {
    expect(wordForms('דגש')).toEqual(['דגש']);
    expect(wordForms('בית')).toEqual(['בית']);
  });
});

describe('queryVariants', () => {
  it('finds "שוא נע" under its full spelling, and not the query itself', () => {
    const variants = queryVariants('שוא נע');
    expect(variants[0]).toBe('שווא נע');
    expect(variants).not.toContain('שוא נע');
  });

  it('drops framing words, and tries each word alone', () => {
    expect(queryVariants('פרשת שמיני')).toContain('שמיני');
    expect(queryVariants('בר מצוה')).toEqual(expect.arrayContaining(['בר מצווה', 'מצווה']));
    expect(queryVariants('בר מצוה')).not.toContain('בר'); // too short to search alone
  });

  it('gives typed quotes and the Hebrew marks the same fallbacks', () => {
    expect(queryVariants("ו' החיבור")).toEqual(queryVariants('ו׳ החיבור'));
    expect(queryVariants('תנ"ך')).toEqual(queryVariants('תנ״ך'));
  });

  it('keeps the number of searches small', () => {
    expect(queryVariants('השווא הנע בתחילת המילה').length).toBeLessThanOrEqual(16);
    expect(queryVariants('')).toEqual([]);
  });
});

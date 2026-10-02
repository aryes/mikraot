import { describe, expect, it } from 'vitest';
import { hebrewTypography, plainTypography } from './typography';

describe('hebrewTypography', () => {
  it.each([
    ["האות ו' והא'", 'האות ו׳ והא׳'],
    ['ג’ ו-ז’,', 'ג׳ ו-ז׳,'],
    ["בְּ' with niqqud", 'בְּ׳ with niqqud'],
    ['התנ"ך ורש"י', 'התנ״ך ורש״י'],
    ['כלל - יוצא', 'כלל – יוצא'],
  ])('%s', (input, expected) => expect(hebrewTypography(input)).toBe(expected));

  it('leaves quotation marks, English and hyphenated words alone', () => {
    for (const text of ['"אליהו הנביא"', '“הצג הכל”', "visitor's", 'ו-“הגדרות', '- item']) {
      expect(hebrewTypography(text)).toBe(text);
    }
  });

  it('is undone by plainTypography', () => {
    const text = 'ו\' התנ"ך - סוף';
    expect(plainTypography(hebrewTypography(text))).toBe(text);
  });
});

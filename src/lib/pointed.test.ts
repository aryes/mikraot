import { describe, expect, it } from 'vitest';
import { pointedRanges, splitPointed } from './pointed';

const pointed = (text: string) =>
  splitPointed(text)
    .filter((p) => p.pointed)
    .map((p) => p.text);

describe('pointed text', () => {
  it('finds words with niqqud or cantillation marks', () => {
    expect(pointed('למשל: וְהָאָ֗רֶץ - הטעם מעל הא׳')).toEqual(['וְהָאָ֗רֶץ']);
  });

  it('joins a whole pointed verse into one run, with maqaf and sof pasuq', () => {
    const verse = 'וַיֹּ֣אמֶר אֱלֹהִ֔ים יְהִ֥י א֖וֹר וַֽיְהִי־אֽוֹר׃';
    expect(pointed(`פסוק: ${verse} סוף`)).toEqual([verse]);
  });

  it('treats a hyphen between pointed words as part of the run', () => {
    expect(pointed('פַּשְׁטָא֙ זָקֵף-קָטֹ֔ן')).toEqual(['פַּשְׁטָא֙ זָקֵף-קָטֹ֔ן']);
  });

  it('leaves plain Hebrew, geresh/gershayim and Latin alone', () => {
    expect(pointed('ה׳ הידיעה, תנ״ך, and English')).toEqual([]);
  });

  it('judges a word split across elements as a whole', () => {
    // "בּ" coloured separately inside "הַבַּיִת": the plain piece "ה" still belongs to the word.
    const full = 'הַבַּיִת';
    const ranges = pointedRanges(full);
    expect(splitPointed('ה', ranges, 0)).toEqual([{ text: 'ה', pointed: true }]);
    expect(splitPointed('ַבַּיִת', ranges, 1)).toEqual([{ text: 'ַבַּיִת', pointed: true }]);
  });

  it('keeps text intact when splitting', () => {
    const text = 'שווא נע: בְּרֵאשִׁ֖ית בָּרָ֣א, ולא שווא נח';
    expect(
      splitPointed(text)
        .map((p) => p.text)
        .join(''),
    ).toBe(text);
  });
});

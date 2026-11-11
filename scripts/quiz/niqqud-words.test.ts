import { describe, expect, it } from 'vitest';
import { verseNiqqudItems, withoutTeamim, wordItems } from './niqqud-words';

/** Each item as "answer: the word with its marked letters in brackets". */
const shown = (word: string) =>
  wordItems(word).map(({ answer, item: { w, h = [0, 0] } }) => {
    const [start, end] = h;
    return `${answer}: ${w.slice(0, start)}[${w.slice(start, end)}]${w.slice(end)}`;
  });

describe('wordItems', () => {
  it('finds each vowel under its letter, once a word', () => {
    expect(shown('בְּרֵאשִׁית')).toEqual([
      'שווא: [בְּ]רֵאשִׁית',
      'צירה: בְּ[רֵ]אשִׁית',
      'חיריק-מלא: בְּרֵא[שִׁי]ת',
    ]);
    expect(shown('הַשָּׁמַיִם')).toEqual([
      'פתח: [הַ]שָּׁמַיִם',
      'קמץ: הַ[שָּׁ]מַיִם',
      'חיריק-חסר: הַשָּׁמַ[יִ]ם',
    ]);
  });

  it('marks a vowel letter ו with the consonant whose vowel it is', () => {
    expect(shown('קוֹל')).toEqual(['חולם-מלא: [קוֹ]ל']);
    expect(shown('שׁוּב')).toEqual(['שורוק: [שׁוּ]ב']);
    expect(shown('וּפָרַע')).toEqual(['שורוק: [וּ]פָרַע', 'קמץ: וּ[פָ]רַע', 'פתח: וּפָ[רַ]ע']);
  });

  it('reads a ו with a vowel of its own as a consonant', () => {
    expect(shown('מִצְוֹת')).toEqual([
      'חיריק-חסר: [מִ]צְוֹת',
      'שווא: מִ[צְ]וֹת',
      'חולם-חסר: מִצְ[וֹ]ת',
    ]);
    expect(shown('חַוָּה')).toEqual(['פתח: [חַ]וָּה', 'קמץ: חַ[וָּ]ה']);
    // As MAM writes it: the חולם of a consonant ו is U+05BA.
    expect(shown('לְצַוֺּת')).toEqual([
      'שווא: [לְ]צַוֺּת',
      'פתח: לְ[צַ]וֺּת',
      'חולם-חסר: לְצַ[וֺּ]ת',
    ]);
    expect(shown('וֹן')).toEqual(['חולם-חסר: [וֹ]ן']);
  });

  it('leaves out a ו it cannot read, and keeps a חיריק before a pointed י short', () => {
    // A dagesh in a ו after a vowel: a doubled consonant or a שורוק, which the text doesn't say.
    expect(shown('קַוּ')).toEqual(['פתח: [קַ]וּ']);
    expect(shown('תַּחְתִּיִּם')).toEqual([
      'פתח: [תַּ]חְתִּיִּם',
      'שווא: תַּ[חְ]תִּיִּם',
      'חיריק-חסר: תַּחְ[תִּ]יִּם',
    ]);
    // A קמץ קטן before a vowel letter: a vowel of its own, so the ו is not one.
    expect(shown('קׇוֹ')).toEqual(['קמץ-קטן: [קׇ]וֹ', 'חולם-חסר: קׇ[וֹ]']);
  });

  it('keeps a qamats qatan apart, and leaves out a letter with two vowels', () => {
    expect(shown('חׇכְמָה')).toEqual(['קמץ-קטן: [חׇ]כְמָה', 'שווא: חׇ[כְ]מָה', 'קמץ: חׇכְ[מָ]ה']);
    expect(shown('יְרוּשָׁלִַם')).toEqual([
      'שווא: [יְ]רוּשָׁלִַם',
      'שורוק: יְ[רוּ]שָׁלִַם',
      'קמץ: יְרוּ[שָׁ]לִַם',
    ]);
  });
});

describe('verseNiqqudItems', () => {
  it('takes single words without their cantillation, and writes a qamats qatan as a qamats', () => {
    expect(withoutTeamim('הָאָֽרֶץ׃')).toBe('הָאָרֶץ');
    const items = verseNiqqudItems('עַל־הָאָ֖רֶץ חׇ֣כְמָ֔ה');
    expect(items.map(({ item }) => item.w)).toEqual(['חָכְמָה', 'חָכְמָה', 'חָכְמָה']);
  });

  it('never asks about the divine name, whose vowels are those of another word', () => {
    expect(verseNiqqudItems('יְהֹוָ֥ה לַיהֹוָ֖ה יֱהֹוִ֑ה')).toEqual([]);
  });
});

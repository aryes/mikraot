import { describe, expect, it } from 'vitest';
import { lettersOf, naRules, shvaGroup, verseShvaItems } from './shva-words';

/** Each shva of a word that the rules settle, as "group: its letter". */
const groups = (word: string) => {
  const letters = lettersOf(word);
  return letters.flatMap((letter, i) => {
    const group = shvaGroup(letters, i);
    return group ? [`${group}: ${letter.letter}`] : [];
  });
};

describe('shvaGroup', () => {
  it('names the rule of a שווא נע, as the page does (אבגד״ה)', () => {
    expect(groups('וְלָבָן')).toEqual(['נע-ראש: ו']);
    expect(groups('וַתִּקְרְבוּן')).toEqual(['נח-קטנה: ק', 'נע-שני: ר']);
    expect(groups('וַתֹּאמְרוּ')).toEqual(['נע-גדולה: מ']);
    expect(groups('צֵאתְךָ')).toEqual(['נע-גדולה: ת']);
    expect(groups('הַדְּבָרִים')).toEqual(['נע-דגש: ד']);
    expect(groups('מְצַוְּךָ')).toEqual(['נע-ראש: מ', 'נע-דגש: ו']);
    expect(groups('הַֽלְלוּ')).toEqual(['נע-דומות: ל']);
  });

  it('names a שווא נח after a short vowel or at the end of a word', () => {
    expect(groups('יִשְׁמְרוּ')).toEqual(['נח-קטנה: ש', 'נע-שני: מ']);
    expect(groups('לֶךְ')).toEqual(['נח-סוף: ך']);
  });

  it("leaves out what the page's rules don't settle", () => {
    // After ו החיבור (the page's exception); a meteg on a short vowel; two shvas at the end.
    expect(groups('וּלְאִמּוֹ')).toEqual([]);
    expect(groups('וַֽיְהִי')).toEqual([]);
    expect(groups('הָיְתָה')).toEqual([]);
    expect(groups('חָֽרְבוּ')).toEqual(['נע-גדולה: ר']);
    expect(groups('וַיֵּשְׁתְּ')).toEqual(['נח-סוף: ת']);
  });
});

describe('verseShvaItems', () => {
  it('takes single words without their cantillation, the meteg kept', () => {
    expect(verseShvaItems('וַיִּשְׁמְר֥וּ הָֽאֲנָשִׁ֖ים')).toEqual([
      { answer: 'נח-קטנה', item: { w: 'וַיִּשְׁמְרוּ', h: [5, 8] } },
      { answer: 'נע-שני', item: { w: 'וַיִּשְׁמְרוּ', h: [8, 10] } },
    ]);
  });
});

/** Every rule of a word's letter whose shva is נע, as "letter: rules". */
const rules = (word: string) => {
  const letters = lettersOf(word);
  return letters.flatMap((letter, i) => {
    const found = naRules(letters, i);
    return found.length > 0 ? [`${letter.letter}: ${found.join(' ')}`] : [];
  });
};

describe('naRules', () => {
  it('names every rule that makes a shva נע, as the page does for its examples', () => {
    // The page's own: בְּכ֥וֹר "בראש מילה ובגלל הדגש", וְעַבְדְּךָ "בגלל הדגש ובגלל שהוא השני".
    expect(rules('בְּכוֹר')).toEqual(['ב: נע-ראש נע-דגש']);
    expect(rules('וְעַבְדְּךָ')).toEqual(['ו: נע-ראש', 'ד: נע-שני נע-דגש']);
    expect(rules('וְלָבָן')).toEqual(['ו: נע-ראש']);
  });

  it('gives a word asked by one rule the others as answers never offered as wrong', () => {
    const item = verseShvaItems('בְּכֹ֥ור').find(({ answer }) => answer === 'נע-ראש');
    expect(item?.item.x).toEqual(['נע-דגש']);
  });
});

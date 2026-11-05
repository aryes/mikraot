import { describe, expect, it } from 'vitest';
import { hasTwoSets, spread, tokens, verseItems } from './torah-words';

// Verses as Sefaria gives them (Genesis 1:29, 8:18; Leviticus 21:4 shortened; Genesis 8:17's
// ketiv/qere).
const LEGARMEH =
  'וַיֹּ֣אמֶר אֱלֹהִ֗ים הִנֵּה֩ נָתַ֨תִּי לָכֶ֜ם אֶת־כׇּל־עֵ֣שֶׂב&thinsp;<b>׀</b> זֹרֵ֣עַ זֶ֗רַע';
const PASEQ = 'וַיִּקְרָ֨א אֱלֹהִ֤ים&thinsp;<small>׀</small>&thinsp;לָאוֹר֙ י֔וֹם';
const MEAYLA = 'וַיֵּ֖צֵא־נֹ֑חַ וּבָנָ֛יו וְאִשְׁתּ֥וֹ וּנְשֵֽׁי־בָנָ֖יו אִתּֽוֹ׃';
const KETIV =
  'עַל־הָאָ֖רֶץ <span class="mam-kq"><span class="mam-kq-k">(הוצא)</span> <span class="mam-kq-q">[הַיְצֵ֣א]</span></span> אִתָּ֑ךְ';

const tropesOf = (html: string) => verseItems(html).map(({ trope, item }) => `${trope}: ${item.w}`);

describe('tokens', () => {
  it('drops section marks and footnotes, and writes qamats qatan as a qamats', () => {
    const html =
      'אִתּֽוֹ׃<sup class="footnote-marker">*</sup><i class="footnote">הערה</i>&nbsp;<span class="mam-spi-pe">{פ}</span><br>';
    expect(tokens(html).map((t) => t.text)).toEqual(['אִתּֽוֹ׃']);
    expect(tokens('כׇּל')[0]?.text).toBe('כָּל');
  });
});

describe('verseItems', () => {
  it('finds one trope per word or maqaf chain', () => {
    expect(tropesOf('וַיֹּ֣אמֶר אֱלֹהִ֗ים')).toEqual(['מונח: וַיֹּ֣אמֶר', 'רביעי: אֱלֹהִ֗ים']);
  });

  it('pairs קדמא with its אזלא, and shows a לגרמיה with its line', () => {
    expect(tropesOf(LEGARMEH)).toEqual([
      'מונח: וַיֹּ֣אמֶר',
      'רביעי: אֱלֹהִ֗ים',
      'תלישא-קטנה: הִנֵּה֩',
      'קדמא-ואזלא: נָתַ֨תִּי לָכֶ֜ם',
      'מונח-לגרמיה: אֶת־כׇּל־עֵ֣שֶׂב ׀'.replace('\u05C7', '\u05B8'),
      'מונח: זֹרֵ֣עַ',
      'רביעי: זֶ֗רַע',
    ]);
  });

  it('leaves out a word before a paseq', () => {
    expect(tropesOf(PASEQ)).toEqual(['קדמא: וַיִּקְרָ֨א', 'פשטא: לָאוֹר֙', 'זקף-קטן: י֔וֹם']);
  });

  it('marks the word of a מאילא in its chain, and tells it from a טפחא', () => {
    expect(verseItems(MEAYLA)[0]).toEqual({ trope: 'מאילא', item: { w: 'וַיֵּ֖צֵא־נֹ֑חַ', m: 0 } });
    expect(tropesOf(MEAYLA).slice(1)).toEqual([
      'תביר: וּבָנָ֛יו',
      'מרכא: וְאִשְׁתּ֥וֹ',
      'טפחא: וּנְשֵֽׁי־בָנָ֖יו',
      'סוף-פסוק: אִתּֽוֹ׃',
    ]);
    expect(verseItems('לְהֵ֖חַלּֽוֹ׃')).toEqual([{ trope: 'מאילא', item: { w: 'לְהֵ֖חַלּֽוֹ׃' } }]);
  });

  it('counts a doubled פשטא as שני פשטין, and other doubled signs once', () => {
    expect(tropesOf('תֹ֙הוּ֙ וּסְקָל֩וּהָ֩')).toEqual([
      'שני-פשטין: תֹ֙הוּ֙',
      'תלישא-קטנה: וּסְקָל֩וּהָ֩',
    ]);
  });

  it('skips a ketiv/qere and the chain it cuts', () => {
    expect(tropesOf(KETIV)).toEqual(['טפחא: עַל־הָאָ֖רֶץ', 'אתנחתא: אִתָּ֑ךְ']);
  });
});

describe('hasTwoSets and spread', () => {
  it('knows the Ten Commandments', () => {
    expect(hasTwoSets('Exodus 20:3')).toBe(true);
    expect(hasTwoSets('Exodus 20:18')).toBe(false);
    expect(hasTwoSets('Deuteronomy 5:17')).toBe(true);
  });

  it('takes items from the whole list', () => {
    expect(spread([1, 2, 3, 4, 5, 6], 3)).toEqual([1, 3, 5]);
    expect(spread([1, 2], 3)).toEqual([1, 2]);
  });
});

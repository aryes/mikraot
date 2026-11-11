import { describe, expect, it } from 'vitest';
import { servantItems, versePairs } from './servant-words';

describe('versePairs', () => {
  it('finds a servant before the disjunctive it serves, its sign taken off', () => {
    expect(versePairs('בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים')).toEqual([
      {
        servant: 'מונח',
        disjunctive: 'אתנחתא',
        item: { w: 'בָּרָא אֱלֹהִ֑ים', h: [0, 6], a: 'מונח', o: 'בָּרָ֣א' },
      },
    ]);
  });

  it('takes a לגרמיה line as a disjunctive, and skips a word before a פסק', () => {
    expect(versePairs('בְּאֹ֥הֶל יַעֲקֹ֣ב <b>׀</b> רַבִּ֑ים')[0]).toMatchObject({
      servant: 'מרכא',
      disjunctive: 'מונח-לגרמיה',
    });
    expect(versePairs('וַיֹּ֣אמֶר <small>׀</small> אֱלֹהִ֑ים')).toEqual([]);
  });
});

/** A pair of the Torah before a תביר, as versePairs gives it. */
const pair = (servant: string, w: string) => ({
  servant,
  disjunctive: 'תביר',
  item: { w, h: [0, 1], a: servant },
});

describe('servantItems', () => {
  it('keeps the usual servants, naming the others that are usual there too', () => {
    const pairs = [
      ...['א', 'ב', 'ג'].map((w) => pair('דרגא', w)),
      ...['ד', 'ה', 'ו'].map((w) => pair('מרכא', w)),
      pair('מונח', 'ז'),
    ];
    const items = servantItems(pairs).get('תביר') ?? [];
    expect(items.map((item) => item.w)).toEqual(['א', 'ב', 'ג', 'ד', 'ה', 'ו']);
    expect(items[0]?.x).toEqual(['מרכא']);
  });
});

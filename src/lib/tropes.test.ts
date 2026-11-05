import { describe, expect, it } from 'vitest';
import tropes from '../data/tropes.json';
import menu from '../data/menu.json';
import { switchTitle, TRADITIONS, trope } from './tropes';

describe('tropes.json', () => {
  // Pages show each name as it is, with no fallback, so an empty one would leave a gap.
  it('gives every trope a name in every tradition', () => {
    const missing = Object.entries(tropes).flatMap(([id, names]) =>
      TRADITIONS.filter((tradition) => !names[tradition]).map((tradition) => `${id}: ${tradition}`),
    );
    expect(missing).toEqual([]);
  });
});

describe('switchTitle', () => {
  it('joins the names of several tropes in each tradition', () => {
    expect(switchTitle('מרכא טפחא')).toEqual({
      ashkenazi: 'מֵרְכָ֥א טִפְּחָ֖א',
      sephardi: 'מַאֲרִ֥יךְ טַרְחָ֖א',
    });
  });

  it('knows every trope the menu names', () => {
    const ids = menu.flatMap((item) => ('trope' in item ? item.trope.split(/\s+/) : []));
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(() => trope(id)).not.toThrow();
  });
});

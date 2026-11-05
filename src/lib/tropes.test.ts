import { describe, expect, it } from 'vitest';
import tropes from '../data/tropes.json';
import { TRADITIONS } from './tropes';

describe('tropes.json', () => {
  // Pages show each name as it is, with no fallback, so an empty one would leave a gap.
  it('gives every trope a name in every tradition', () => {
    const missing = Object.entries(tropes).flatMap(([id, names]) =>
      TRADITIONS.filter((tradition) => !names[tradition]).map((tradition) => `${id}: ${tradition}`),
    );
    expect(missing).toEqual([]);
  });
});

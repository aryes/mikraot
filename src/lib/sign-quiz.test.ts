import { describe, expect, it } from 'vitest';
import names from '../../public/quiz/trope-names.json';
import { SIGNED_TROPES } from './trope-signs';

describe('the sign quiz', () => {
  it('asks every trope that has a sign, by its own list of names', () => {
    expect(Object.keys(names.items).toSorted()).toEqual([...SIGNED_TROPES].toSorted());
  });
});

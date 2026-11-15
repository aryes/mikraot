import { describe, expect, it } from 'vitest';
import { QUIZ_TROPES } from './trope-quiz';
import { SIGN_KIND, SIGNED_TROPES, SIGNS } from './trope-signs';

describe('the trope signs', () => {
  it('has a sign for every trope of the trope quiz but מאילא (a טפחא on one letter)', () => {
    expect(QUIZ_TROPES.filter((id) => !(id in SIGNS))).toEqual(['מאילא']);
    expect(SIGNED_TROPES).toHaveLength(Object.keys(SIGNS).length);
  });

  it('draws every sign differently', () => {
    expect(new Set(Object.values(SIGNS)).size).toBe(Object.keys(SIGNS).length);
  });

  it('offers look-alikes only among its own tropes', () => {
    for (const group of SIGN_KIND.lookAlikes) {
      for (const id of group) expect(SIGNED_TROPES).toContain(id);
    }
  });
});

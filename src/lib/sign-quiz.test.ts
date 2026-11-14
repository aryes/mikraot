import { describe, expect, it } from 'vitest';
import names from '../../public/quiz/trope-names.json';
import { SIGN_QUIZ, SIGN_TROPES, SIGNS } from './sign-quiz';
import { QUIZ_TROPES } from './trope-quiz';

describe('the sign quiz', () => {
  it('has a sign for every trope of the trope quiz but מאילא (a טפחא on one letter)', () => {
    expect(QUIZ_TROPES.filter((id) => !(id in SIGNS))).toEqual(['מאילא']);
    expect(SIGN_TROPES).toHaveLength(Object.keys(SIGNS).length);
  });

  it('asks every trope of the quiz, by its own list of names', () => {
    expect(Object.keys(names.items).toSorted()).toEqual([...SIGN_TROPES].toSorted());
  });

  it('draws every sign differently', () => {
    expect(new Set(Object.values(SIGNS)).size).toBe(Object.keys(SIGNS).length);
  });

  it('offers look-alikes only among its own tropes', () => {
    for (const group of SIGN_QUIZ.lookAlikes) {
      for (const id of group) expect(SIGN_TROPES).toContain(id);
    }
  });
});

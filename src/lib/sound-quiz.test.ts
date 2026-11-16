import { describe, expect, it } from 'vitest';
import times from '../data/quiz/sound-times.json';
import { RECORDINGS, SOUNDS, recordingOf, soundForms } from './sound-quiz';

describe('the sound quiz', () => {
  it('writes each sound with the vowels that make it, the חטפים under a guttural only', () => {
    expect(soundForms('בּ')).toEqual({
      a: ['בָּ', 'בַּ'],
      e: ['בֵּ', 'בֶּ'],
      i: ['בִּ', 'בִּי'],
      o: ['בֹּ', 'בּוֹ'],
      u: ['בֻּ', 'בּוּ'],
    });
    expect(soundForms('ע').a).toEqual(['עָ', 'עַ', 'עֲ']);
    expect(soundForms('ע').o).toContain('עֳ');
    // A ו with its vowel alone would read as the vowel without the ו.
    expect(soundForms('ו').o).toEqual(['ווֹ']);
    expect(soundForms('ו').u).toEqual(['ווּ']);
  });

  it('finds the recording of every form it writes', () => {
    for (const [name, letter] of Object.entries(RECORDINGS)) {
      for (const forms of Object.values(soundForms(letter))) {
        for (const form of forms) expect(recordingOf(form), form).toBe(name);
      }
    }
  });

  it('tells a letter with its dagesh from one without, and a שורוק from a dagesh', () => {
    expect(recordingOf('כּוּ')).toBe('כ-דגושה');
    expect(recordingOf('כוּ')).toBe('כ-רפויה');
    expect(recordingOf('שׁוֹ')).toBe('ש');
  });

  it('has five syllables for every recording, in order', () => {
    const found: Readonly<Record<string, readonly (readonly number[])[]>> = times;
    expect(Object.keys(found).toSorted()).toEqual(Object.keys(RECORDINGS).toSorted());
    for (const spans of Object.values(found)) {
      expect(spans).toHaveLength(SOUNDS.length);
      // In order, each with how much louder to play it.
      const flat = spans.flatMap((span) => span.slice(0, 2));
      expect(flat.toSorted((a, b) => a - b)).toEqual(flat);
      for (const span of spans) expect(span[2]).toBeGreaterThanOrEqual(1);
    }
  });
});

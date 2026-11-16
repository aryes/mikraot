import { describe, expect, it } from 'vitest';
import { gainOf, syllables } from './syllables';

/** Loudness in frames of 0.01 s: silence (0) and syllables (1), each `[loud, frames]`. */
const loudness = (...parts: [number, number][]) =>
  parts.flatMap(([value, frames]) => Array.from({ length: frames }, () => value));

describe('syllables', () => {
  it('finds each loud stretch, cut from the next in the middle of the silence between', () => {
    const found = syllables(loudness([0, 50], [1, 30], [0, 40], [1, 30], [0, 50]), 0.01, 2);
    expect(found).toEqual([
      [0.2, 1],
      [1, 1.8],
    ]);
  });

  it('keeps a short dip inside a syllable, and drops a click', () => {
    const found = syllables(
      loudness([0, 50], [1, 10], [0, 5], [1, 20], [0, 60], [1, 3], [0, 60], [1, 30], [0, 50]),
      0.01,
      2,
    );
    expect(found).toHaveLength(2);
    expect(found?.[0]?.[0]).toBeCloseTo(0.2);
  });

  it('splits two syllables that run together at their quietest point', () => {
    const found = syllables(
      loudness([0, 50], [1, 30], [0, 40], [1, 30], [0.5, 5], [1, 30], [0, 50]),
      0.01,
      3,
    );
    expect(found).toHaveLength(3);
    expect(found?.[2]?.[1]).toBeGreaterThan(found?.[1]?.[1] ?? 0);
  });

  it('keeps a soft start with its syllable, cutting where it is quietest', () => {
    // A quiet onset (0.03, under the threshold) just before the second syllable.
    const found = syllables(
      loudness([0, 50], [1, 30], [0, 30], [0.03, 10], [1, 30], [0, 50]),
      0.01,
      2,
    );
    expect(found?.[1]?.[0]).toBeLessThanOrEqual(0.95);
  });

  it('cuts noisy silence, as in a real recording, in the middle of its quietest part', () => {
    const found = syllables(
      loudness([0.001, 50], [1, 30], [0.0015, 20], [0.001, 20], [0.0015, 20], [1, 30], [0.001, 50]),
      0.01,
      2,
    );
    // The two share their cut: nothing skipped, nothing heard twice.
    expect(found?.[0]?.[1]).toBe(found?.[1]?.[0]);
    expect(found?.[0]?.[1]).toBeGreaterThan(1);
    expect(found?.[0]?.[1]).toBeLessThan(1.4);
    // And the first and last keep 0.3 s around them, within the recording.
    expect(found?.[0]?.[0]).toBeCloseTo(0.2);
    expect(found?.[1]?.[1]).toBeCloseTo(2);
  });

  it('says so when a recording holds fewer syllables than asked', () => {
    expect(syllables(loudness([0, 50], [1, 30], [0, 50]), 0.01, 2)).toBeUndefined();
  });
});

describe('gainOf', () => {
  // Two syllables, the second a fifth as loud: [loudness, frames], the samples' peaks twice that.
  const quiet = loudness([0, 10], [1, 10], [0, 10], [0.2, 10], [0, 10]);
  const peaks = quiet.map((value) => value * 2);

  it('brings a quiet syllable up to the loudest, and leaves the loudest as it is', () => {
    expect(gainOf(quiet, peaks, 0.01, [0.3, 0.5])).toBe(5);
    expect(gainOf(quiet, peaks, 0.01, [0, 0.3])).toBe(1);
  });

  it('never clips, nor goes past six times', () => {
    // A sharp click in the quiet syllable: its samples already near the highest.
    const clicked = peaks.map((value, i) => (i === 35 ? 1.6 : value));
    expect(gainOf(quiet, clicked, 0.01, [0.3, 0.5])).toBe(1.25);
    const faint = loudness([0, 10], [1, 10], [0, 10], [0.01, 10], [0, 10]);
    expect(gainOf(faint, faint, 0.01, [0.3, 0.5])).toBe(6);
  });
});

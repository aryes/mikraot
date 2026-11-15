import { describe, expect, it } from 'vitest';
import { syllables } from './syllables';

/** Loudness in frames of 0.01 s: silence (0) and syllables (1), each `[loud, frames]`. */
const loudness = (...parts: [number, number][]) =>
  parts.flatMap(([value, frames]) => Array.from({ length: frames }, () => value));

describe('syllables', () => {
  it('finds each loud stretch, played with a margin as far as halfway to the next', () => {
    const found = syllables(loudness([0, 50], [1, 30], [0, 40], [1, 30], [0, 50]), 0.01, 2);
    expect(found).toEqual([
      [0.38, 0.92],
      [1.08, 1.62],
    ]);
  });

  it('keeps a short dip inside a syllable, and drops a click', () => {
    const found = syllables(
      loudness([0, 50], [1, 10], [0, 5], [1, 20], [0, 60], [1, 3], [0, 60], [1, 30], [0, 50]),
      0.01,
      2,
    );
    expect(found).toHaveLength(2);
    expect(found?.[0]?.[0]).toBeCloseTo(0.38);
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

  it('says so when a recording holds fewer syllables than asked', () => {
    expect(syllables(loudness([0, 50], [1, 30], [0, 50]), 0.01, 2)).toBeUndefined();
  });
});

/**
 * Where a recording's syllables are, from its loudness: the stretches above a share of its peak,
 * short dips inside a syllable closed and clicks dropped. Pure; scripts/quiz/sound-letters.ts
 * gives it each recording's loudness, measured in a browser.
 */

/** Loudness above this share of the peak is a syllable. */
const ON = 0.06;
/** A quieter stretch shorter than this (seconds) is inside a syllable (a stop's closure). */
const GAP = 0.12;
/** A louder stretch shorter than this (seconds) is a click, not a syllable. */
const SHORTEST = 0.08;
/** Two syllables run together dip below this share of their loudest between them. */
const DIP = 0.6;
/** Played this much before and after a syllable (seconds), as far as halfway to the next. */
const MARGIN = 0.12;

type Span = [number, number];

/** Seconds to the hundredth. */
const round = (seconds: number) => Math.round(seconds * 100) / 100;

/**
 * The `count` syllables of a recording, each as the [start, end] seconds to play it by, from its
 * loudness in frames of `frame` seconds. Where two run together (fewer stretches than syllables),
 * the longest is split at its quietest frame. Undefined if it doesn't hold `count`.
 */
export function syllables(
  loudness: readonly number[],
  frame: number,
  count: number,
): Span[] | undefined {
  const peak = Math.max(...loudness);
  const runs: Span[] = [];
  let start = -1;
  loudness.forEach((value, i) => {
    const on = value > peak * ON;
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      runs.push([start, i]);
      start = -1;
    }
  });
  if (start >= 0) runs.push([start, loudness.length]);
  const joined: Span[] = [];
  for (const run of runs) {
    const last = joined.at(-1);
    if (last && (run[0] - last[1]) * frame < GAP) last[1] = run[1];
    else joined.push([run[0], run[1]]);
  }
  const found = joined.filter(([from, to]) => (to - from) * frame >= SHORTEST);
  while (found.length > 0 && found.length < count) {
    const longest = found.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a));
    // The quietest frame in its middle half: between two syllables, not at an edge.
    const quarter = Math.floor((longest[1] - longest[0]) / 4);
    let quietest = longest[0] + quarter;
    for (let i = quietest; i < longest[1] - quarter; i++) {
      if ((loudness[i] ?? 0) < (loudness[quietest] ?? 0)) quietest = i;
    }
    // A real dip between two syllables, not one long sound.
    const loudest = Math.max(...loudness.slice(longest[0], longest[1]));
    if ((loudness[quietest] ?? 0) > loudest * DIP) break;
    found.splice(found.indexOf(longest), 1, [longest[0], quietest], [quietest + 1, longest[1]]);
  }
  if (found.length !== count) return undefined;
  const end = loudness.length * frame;
  return found.map(([from, to], i) => {
    const before = i > 0 ? (found[i - 1]?.[1] ?? 0) * frame : 0;
    const after = i < found.length - 1 ? (found[i + 1]?.[0] ?? 0) * frame : end;
    return [
      round(Math.max(from * frame - MARGIN, (before + from * frame) / 2)),
      round(Math.min(to * frame + MARGIN, (to * frame + after) / 2)),
    ];
  });
}

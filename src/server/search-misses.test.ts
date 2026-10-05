import { describe, expect, it } from 'vitest';
import { parseSearchMiss, recordSearchMiss } from './search-misses';

describe('parseSearchMiss', () => {
  it('keeps a query, tidied so that one query is one row', () => {
    expect(parseSearchMiss({ query: '  שווא   מרחף ' })).toBe('שווא מרחף');
    expect(parseSearchMiss({ query: 'Shva' })).toBe('shva');
    // Dagesh and vowel typed in either order: the same query.
    expect(parseSearchMiss({ query: 'בָּ' })).toBe(parseSearchMiss({ query: 'בָּ' }));
  });

  it('writes one data point per miss', () => {
    const points: unknown[] = [];
    recordSearchMiss({ writeDataPoint: (point) => points.push(point) }, 'קמץ חטוף');
    expect(points).toEqual([{ blobs: ['קמץ חטוף'], doubles: [1] }]);
  });

  it('drops what looks like personal data', () => {
    expect(parseSearchMiss({ query: 'dana@example.com' })).toBeNull();
    expect(parseSearchMiss({ query: '050-123 4567' })).toBeNull();
    expect(parseSearchMiss({ query: '050.123.4567' })).toBeNull();
    expect(parseSearchMiss({ query: '+972 (50) 123.4567' })).toBeNull();
    expect(parseSearchMiss({ query: 'ת.ז. 012345678' })).toBeNull();
    expect(parseSearchMiss({ query: 'פרק 12 פסוק 4' })).toBe('פרק 12 פסוק 4');
  });

  it('drops empty, overlong and malformed input', () => {
    expect(parseSearchMiss({ query: ' ' })).toBeNull();
    expect(parseSearchMiss({ query: 'א'.repeat(101) })).toBeNull();
    expect(parseSearchMiss({ query: 5 })).toBeNull();
    expect(parseSearchMiss('שווא')).toBeNull();
  });
});

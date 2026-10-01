import { describe, expect, it } from 'vitest';
import { excerptOf, pagePath, urlForPath } from './urls';

describe('pagePath', () => {
  const parents: Record<string, string | undefined> = { 'נוסח-אשכנז': 'טעמים', a: 'b', b: 'a' };
  const parentOf = (slug: string) => parents[slug];

  it('gives the front page an empty path', () => {
    expect(pagePath('מקראות', parentOf, 'מקראות')).toBe('');
  });

  it('nests pages under their parents like WordPress hierarchical permalinks', () => {
    expect(pagePath('נוסח-אשכנז', parentOf, 'מקראות')).toBe('טעמים/נוסח-אשכנז');
    expect(pagePath('about', parentOf, 'מקראות')).toBe('about');
  });

  it('survives a parent cycle', () => {
    expect(pagePath('a', parentOf, 'מקראות')).toBe('b/a');
  });
});

describe('urlForPath', () => {
  it('adds slashes like WordPress', () => {
    expect(urlForPath('')).toBe('/');
    expect(urlForPath('a/b')).toBe('/a/b/');
  });
});

describe('excerptOf', () => {
  it('takes the first words of the text, without Markdoc syntax', () => {
    const body =
      'בשמחה {% highlight %}**ובהתרגשות**{% /highlight %} אני [מציג](/x/) את&nbsp;מקראות {% audio src="/a.mp3" /%} \\[1\\] ועוד';
    expect(excerptOf(body, 6)).toBe('בשמחה ובהתרגשות אני מציג את מקראות …');
    expect(excerptOf(body, 50)).toBe('בשמחה ובהתרגשות אני מציג את מקראות [1] ועוד');
  });
});

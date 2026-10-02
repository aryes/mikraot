import { describe, expect, it } from 'vitest';
import { archiveMonths, categoryUrl, formatDate, monthOf } from './archive';

describe('monthOf', () => {
  it('gives the URL and Hebrew label of the month', () => {
    expect(monthOf(new Date('2021-08-11T16:11:33Z'))).toEqual({
      year: '2021',
      month: '08',
      label: 'אוגוסט 2021',
      url: '/2021/08/',
    });
  });

  it('uses Israel time: late on the last UTC day of a month is already the next month', () => {
    expect(monthOf(new Date('2021-08-31T22:30:00Z')).url).toBe('/2021/09/');
  });
});

describe('archiveMonths', () => {
  it('lists each month once, newest first', () => {
    const dates = ['2021-08-01', '2022-01-31', '2021-08-20'].map((d) => new Date(`${d}T12:00Z`));
    expect(archiveMonths(dates).map((m) => m.url)).toEqual(['/2022/01/', '/2021/08/']);
  });
});

describe('helpers', () => {
  it('builds archive URLs and WordPress-style dates', () => {
    expect(categoryUrl('חדשות-האתר')).toBe('/category/חדשות-האתר/');
    expect(formatDate(new Date('2021-08-11T16:11:33Z'))).toBe('11/08/2021');
  });
});

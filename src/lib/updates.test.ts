import { describe, expect, it } from 'vitest';
import { collectUpdates, type UpdateSource } from './updates';

const day = (d: string) => new Date(`${d}T00:00:00Z`);

const sources: UpdateSource[] = [
  {
    title: 'דגש קל',
    url: '/דגש-קל/',
    kind: 'page',
    date: day('2021-09-01'),
    summary: '',
    updates: [
      { date: day('2026-10-01'), note: 'נוספו הקלטות' },
      { date: day('2026-11-01'), note: 'נוסף תרגול' },
    ],
  },
  {
    title: 'בראשית',
    url: '/בראשית/',
    kind: 'post',
    date: day('2026-10-15'),
    summary: 'פוסט חדש',
    updates: [],
  },
  { title: 'מבטא', url: '/מבטא/', kind: 'page', date: day('2021-08-01'), summary: '', updates: [] },
];

describe('collectUpdates', () => {
  it('lists page updates and posts together, newest first', () => {
    expect(collectUpdates(sources).map((u) => `${u.title}: ${u.note}`)).toEqual([
      'דגש קל: נוסף תרגול',
      'בראשית: פוסט חדש',
      'דגש קל: נוספו הקלטות',
    ]);
  });

  it('leaves out pages without announcements', () => {
    expect(collectUpdates(sources).some((u) => u.title === 'מבטא')).toBe(false);
  });
});

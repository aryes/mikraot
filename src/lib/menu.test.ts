import { describe, expect, it } from 'vitest';
import type { MenuItem } from '../types';
import { menuTrail } from './menu';

const item = (id: number, title: string, url: string | null, parentId = 0, order = id) => ({
  id,
  title,
  url,
  parentId,
  order,
});
const menu: MenuItem[] = [
  item(1, 'הגיה', null),
  item(2, 'דגשים', null, 1),
  item(3, 'דגש קל', '/דגש-קל/', 2),
  item(4, 'אודות', '/about/'),
  item(5, 'נוסח אשכנז', '/x/', 1),
  item(6, 'נוסח אשכנז, שוב', '/x/', 4),
];

describe('menuTrail', () => {
  it('gives the entries above a page, outermost first', () => {
    expect(menuTrail(menu, '/דגש-קל/')?.map((entry) => entry.title)).toEqual(['הגיה', 'דגשים']);
  });
  it('is empty for a top-level entry, undefined for a page not in the menu', () => {
    expect(menuTrail(menu, '/about/')).toEqual([]);
    expect(menuTrail(menu, '/news/')).toBeUndefined();
  });
  it('uses the first entry in menu order when a page is linked twice', () => {
    expect(menuTrail(menu, '/x/')?.map((entry) => entry.title)).toEqual(['הגיה']);
  });
  it('stops at a loop instead of hanging', () => {
    const looped = [item(1, 'a', null, 2), item(2, 'b', null, 1), item(3, 'c', '/c/', 1)];
    expect(menuTrail(looped, '/c/')?.map((entry) => entry.title)).toEqual(['b', 'a']);
  });
});

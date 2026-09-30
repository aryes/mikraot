import type { MenuItem } from '../types';

const byOrder = (a: MenuItem, b: MenuItem) => a.order - b.order;

export function buildMenuTree(items: MenuItem[]): MenuItem[] {
  const children = new Map<number, MenuItem[]>();
  for (const item of items) {
    if (item.parentId) children.set(item.parentId, [...(children.get(item.parentId) ?? []), item]);
  }
  const ids = new Set(items.map((item) => item.id));
  const withChildren = (item: MenuItem): MenuItem => ({
    ...item,
    children: (children.get(item.id) ?? []).toSorted(byOrder).map(withChildren),
  });
  return items
    .filter((item) => !item.parentId || !ids.has(item.parentId))
    .toSorted(byOrder)
    .map(withChildren);
}

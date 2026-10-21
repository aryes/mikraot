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

/**
 * The menu entries above the entry that links to `url`, outermost first: a page's place in the
 * menu, for its breadcrumb trail (Arye, 2026-10-21). Undefined when no entry links to it.
 */
export function menuTrail(items: MenuItem[], url: string): MenuItem[] | undefined {
  const byId = new Map(items.map((item) => [item.id, item]));
  let item = items.toSorted(byOrder).find((entry) => entry.url === url);
  if (!item) return undefined;
  const trail: MenuItem[] = [];
  const seen = new Set([item.id]);
  while ((item = byId.get(item.parentId)) && !seen.has(item.id)) {
    seen.add(item.id);
    trail.unshift(item);
  }
  return trail;
}

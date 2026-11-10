import type { MenuEntry, MenuItem } from '../types';

/**
 * The menu as src/data/menu.json keeps it (nested, as Keystatic edits it; Arye's roadmap,
 * 2026-11-10) made flat: each entry numbered in order, with its parent's number. Keystatic writes
 * empty text for a field left blank, read here as absent.
 */
export function flattenMenu(entries: readonly MenuEntry[]): MenuItem[] {
  const items: MenuItem[] = [];
  const add = (list: readonly MenuEntry[], parentId: number) => {
    for (const entry of list) {
      const id = items.length + 1;
      items.push({
        id,
        title: entry.title,
        url: entry.url || null,
        parentId,
        order: id,
        ...(entry.trope ? { trope: entry.trope } : {}),
        ...(entry.sephardiUrl ? { sephardiUrl: entry.sephardiUrl } : {}),
      });
      add(entry.children ?? [], id);
    }
  };
  add(entries, 0);
  return items;
}

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
  let item = items
    .toSorted(byOrder)
    .find((entry) => entry.url === url || entry.sephardiUrl === url);
  if (!item) return undefined;
  const trail: MenuItem[] = [];
  const seen = new Set([item.id]);
  while ((item = byId.get(item.parentId)) && !seen.has(item.id)) {
    seen.add(item.id);
    trail.unshift(item);
  }
  return trail;
}

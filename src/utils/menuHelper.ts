import type { MenuItem } from '../types';

export function buildMenuTree(items: MenuItem[]): MenuItem[] {
  const map = new Map<number, MenuItem>();
  const roots: MenuItem[] = [];

  items.forEach(item => {
    map.set(item.id, { ...item, children: [] });
  });

  items.forEach(item => {
    const node = map.get(item.id)!;
    if (item.parentId && map.has(item.parentId)) {
      map.get(item.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export function cleanUrlToRoute(url: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url, 'https://mikraot.net');
    let pathname = urlObj.pathname;
    // Strip /staging/4160/ or /staging/app/ or trailing slash
    pathname = pathname.replace(/^\/staging\/[^\/]+/, '').replace(/^\/wp-content\/[^\/]+/, '');
    pathname = pathname.replace(/^\/|\/$/g, '');
    try {
      return decodeURIComponent(pathname);
    } catch {
      return pathname;
    }
  } catch {
    return url;
  }
}

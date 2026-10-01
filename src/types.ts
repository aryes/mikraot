export interface MenuItem {
  id: number;
  title: string;
  /** Site path or external URL; null for items that only open a submenu. */
  url: string | null;
  parentId: number;
  order: number;
  children?: MenuItem[];
}

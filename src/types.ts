export interface MenuItem {
  id: number;
  title: string;
  /** Trope ids (src/data/tropes.json) the title names: then it follows the reader's tradition. */
  trope?: string;
  /** Site path or external URL; null for items that only open a submenu. */
  url: string | null;
  parentId: number;
  order: number;
  children?: MenuItem[];
}

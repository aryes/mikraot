/** A menu entry as src/data/menu.json keeps it: nested, the fields left blank possibly empty. */
export interface MenuEntry {
  title: string;
  trope?: string | undefined;
  url?: string | undefined;
  sephardiUrl?: string | undefined;
  children?: readonly MenuEntry[] | undefined;
}

export interface MenuItem {
  id: number;
  title: string;
  /** Trope ids (src/data/tropes.json) the title names: then it follows the reader's tradition. */
  trope?: string;
  /** Site path or external URL; null for items that only open a submenu. */
  url: string | null;
  /**
   * Where the entry leads when the reader chose the Sephardi tradition (the header's switch,
   * src/scripts/nusach.ts): the trope song's Babylonian/Iraqi recording, for now (Arye, 2026-11-10).
   * Only second-level entries (under a top-level one) honour it: SiteHeader.astro reads it there.
   */
  sephardiUrl?: string;
  parentId: number;
  order: number;
  children?: MenuItem[];
}

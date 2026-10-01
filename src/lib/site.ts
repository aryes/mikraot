import { getCollection, type CollectionEntry } from 'astro:content';
import menu from '../data/menu.json';
import siteSettings from '../data/site.json';
import type { MenuItem } from '../types';
import { buildMenuTree } from './menu';
import { pagePath, urlForPath } from './urls';

/** Site title, tagline, copyright and front page (src/data/site.json). */
export const site = siteSettings;

export const menuTree = buildMenuTree(menu satisfies MenuItem[]);

export type PageEntry = CollectionEntry<'pages'>;

export interface SitePage {
  entry: PageEntry;
  /** Path without surrounding slashes; '' for the front page. */
  path: string;
  url: string;
}

/** Every published page and post with its URL (drafts are left out). */
export async function getSitePages(): Promise<SitePage[]> {
  const entries = await getCollection('pages');
  const parents = new Map(entries.map((e) => [e.id, e.data.parent]));
  return entries
    .filter((entry) => !entry.data.draft)
    .map((entry) => {
      const path = pagePath(entry.id, (slug) => parents.get(slug) ?? undefined, site.frontPage);
      return { entry, path, url: urlForPath(path) };
    });
}

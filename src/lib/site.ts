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

/** Key new comments on a page are stored under: its path (the entry ID for the front page). */
export const commentKey = ({ entry, path }: SitePage) => path || entry.id;

/**
 * Every key a page's comments may be stored under: old comments use the page path, the WordPress
 * slug (plain or percent-encoded) or the WordPress ID.
 */
export function commentKeys(page: SitePage): string[] {
  const { entry } = page;
  const keys = [
    commentKey(page),
    entry.id,
    encodeURIComponent(entry.id).toLowerCase(),
    entry.data.wpId?.toString(),
  ];
  return [...new Set(keys.filter((key): key is string => Boolean(key)))];
}

/** Published posts, newest first. */
export async function getPosts(): Promise<SitePage[]> {
  return (await getSitePages())
    .filter(({ entry }) => entry.data.kind === 'post')
    .toSorted((a, b) => b.entry.data.date.getTime() - a.entry.data.date.getTime());
}

export interface Crumb {
  title: string;
  url: string;
}

/** The pages a page nests under, outermost first (for its breadcrumb trail). */
export function parentCrumbs({ path }: SitePage, pages: SitePage[]): Crumb[] {
  const byPath = new Map(pages.map((p) => [p.path, p]));
  const segments = path.split('/');
  return segments.slice(0, -1).flatMap((_, i) => {
    const parent = byPath.get(segments.slice(0, i + 1).join('/'));
    return parent ? [{ title: parent.entry.data.title, url: parent.url }] : [];
  });
}

/** Category names by slug (src/data/site.json). */
export const categoryName = (slug: string) =>
  site.categories.find((c) => c.slug === slug)?.name ?? slug;

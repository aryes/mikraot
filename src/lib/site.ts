import rawSeo from '../data/seo.json';
import rawSiteData from '../data/siteData.json';
import type { ContentItem, SiteData } from '../types';
import { buildMenuTree } from './menu';
import { isPublicPage, pathSegmentsFor, urlForPath } from './urls';

/** Site content exported from WordPress, typed once here instead of cast at each use. */
export const siteData: SiteData = rawSiteData;

export interface PageSeo {
  title: string;
  description?: string;
  ogImage?: string;
}

/** Head tags captured from the live site (scripts/fetch-live-seo.ts), keyed by page path. */
const seoByPath: Record<string, PageSeo | undefined> = rawSeo;

export interface SitePage {
  item: ContentItem;
  seo: PageSeo;
  /** Decoded path without surrounding slashes; '' for the front page. */
  path: string;
  url: string;
}

const byId = new Map(siteData.content.map((item) => [item.id, item]));

/** Every published item that has its own URL; drafts and quiz questions are left out. */
export const sitePages: SitePage[] = siteData.content.filter(isPublicPage).map((item) => {
  const path = pathSegmentsFor(item, byId, siteData.site.frontPageId);
  const seo = seoByPath[path] ?? { title: `${item.title} - ${siteData.site.title}` };
  return { item, seo, path, url: urlForPath(path) };
});

export const menuTree = buildMenuTree(siteData.menu);

const urlsById = new Map(sitePages.map((page) => [page.item.id, page.url]));

/** Site URL of a published page or post by its WordPress ID. */
export const urlForId = (id: number): string | undefined => urlsById.get(id);

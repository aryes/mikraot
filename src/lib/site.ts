import rawSiteData from '../data/siteData.json';
import type { ContentItem, SiteData } from '../types';
import { buildMenuTree } from './menu';
import { isPublicPage, pathSegmentsFor, urlForPath } from './urls';

/** Site content exported from WordPress, typed once here instead of cast at each use. */
export const siteData: SiteData = rawSiteData;

export interface SitePage {
  item: ContentItem;
  /** Decoded path without surrounding slashes; '' for the front page. */
  path: string;
  url: string;
}

const byId = new Map(siteData.content.map((item) => [item.id, item]));

/** Every published item that has its own URL; drafts and quiz questions are left out. */
export const sitePages: SitePage[] = siteData.content.filter(isPublicPage).map((item) => {
  const path = pathSegmentsFor(item, byId, siteData.site.frontPageId);
  return { item, path, url: urlForPath(path) };
});

export const menuTree = buildMenuTree(siteData.menu);

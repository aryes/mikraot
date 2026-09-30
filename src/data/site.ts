import type { ContentItem, SiteData } from '../types';
import rawSiteData from './siteData.json';

/** Site content exported from WordPress, typed once here instead of cast at each use. */
export const siteData: SiteData = rawSiteData;

export const contentOfType = (type: string): ContentItem[] =>
  siteData.content.filter((item) => item.type === type);

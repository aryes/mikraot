import type { ContentItem, MenuItem } from '../types';

/** Content types that have their own public URL. LearnPress courses are deferred to the migration. */
const ROUTABLE_TYPES = new Set(['page', 'post']);

/** WordPress pages that only exist to serve LearnPress (deferred together with the courses). */
const LEARNPRESS_PAGE_SLUGS = new Set([
  'courses',
  'lp-profile',
  'lp-checkout',
  'lp-become-a-teacher',
  'lp-term-conditions',
  'instructor',
  'instructors',
]);

export function isPublicPage(item: ContentItem): boolean {
  return (
    item.status === 'publish' &&
    ROUTABLE_TYPES.has(item.type) &&
    !LEARNPRESS_PAGE_SLUGS.has(item.slug)
  );
}

/**
 * The item's WordPress path, decoded, without leading or trailing slash ('' for the front page).
 * Pages nest under their parent pages, like WordPress hierarchical permalinks.
 */
export function pathSegmentsFor(
  item: ContentItem,
  byId: ReadonlyMap<number, ContentItem>,
  frontPageId: string,
): string {
  if (String(item.id) === frontPageId) return '';
  if (item.type !== 'page') return item.slug;

  const segments = [item.slug];
  const seen = new Set([item.id]);
  let parent = byId.get(item.parentId);
  while (parent && !seen.has(parent.id)) {
    segments.unshift(parent.slug);
    seen.add(parent.id);
    parent = byId.get(parent.parentId);
  }
  return segments.join('/');
}

/** Site-relative URL for a path from `pathSegmentsFor`: `/` or `/a/b/`. */
export function urlForPath(path: string): string {
  return path ? `/${path}/` : '/';
}

/** Menu item URL (absolute WordPress URL, possibly on staging) as a site-relative decoded path. */
export function menuItemUrl(item: MenuItem): string | null {
  if (!item.url) return null;
  const url = new URL(item.url, 'https://mikraot.net');
  if (url.hostname !== 'mikraot.net' && url.hostname !== 'www.mikraot.net') return item.url;
  const path = url.pathname.replace(/^\/staging\/4160/, '').replace(/^\/+|\/+$/g, '');
  try {
    return urlForPath(decodeURIComponent(path));
  } catch {
    return urlForPath(path);
  }
}

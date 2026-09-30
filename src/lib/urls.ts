import type { ContentItem, MenuItem } from '../types';

/** URL prefixes WordPress/LearnPress use per content type (pages and posts have none). */
const TYPE_PREFIX: Record<string, string> = {
  lp_course: 'courses',
  lp_lesson: 'lessons',
  lp_quiz: 'quizzes',
};

/** Content types that have their own public URL. */
const ROUTABLE_TYPES = new Set(['page', 'post', 'lp_course', 'lp_lesson', 'lp_quiz']);

export function isPublicPage(item: ContentItem): boolean {
  return item.status === 'publish' && ROUTABLE_TYPES.has(item.type);
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
  const prefix = TYPE_PREFIX[item.type];
  if (prefix) return `${prefix}/${item.slug}`;
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

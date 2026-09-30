import { siteData } from './data/site';
import type { ContentItem } from './types';

/** Turns a hash (`#/טעמים/נוסח-אשכנז`) or route string into a decoded route without the `#/` prefix. */
export function routeFromHash(hash: string): string {
  const route = hash.replace(/^#\/?/, '');
  try {
    return decodeURIComponent(route);
  } catch {
    return route; // Malformed percent-encoding: use the route as-is.
  }
}

export function navigateTo(route: string): void {
  window.location.hash = `#/${routeFromHash(route)}`;
}

function frontPage(content: ContentItem[]): ContentItem | null {
  return (
    content.find((c) => String(c.id) === siteData.site.frontPageId) ??
    content.find((c) => c.slug === 'home' || c.slug === 'מקראות') ??
    content[0] ??
    null
  );
}

/** Finds the page for a route by slug, raw slug, title or ID, falling back to the last path segment. */
export function findContent(
  route: string,
  content: ContentItem[] = siteData.content,
): ContentItem | null {
  if (!route || route === 'home') return frontPage(content);

  const clean = route.toLowerCase().replace(/^\/|\/$/g, '');
  const exact = content.find(
    (c) =>
      c.slug.toLowerCase() === clean ||
      c.rawSlug.toLowerCase() === clean ||
      c.title.toLowerCase() === clean ||
      String(c.id) === clean,
  );
  if (exact) return exact;

  // Hierarchical WordPress URLs such as טעמים/נוסח-אשכנז match on their last segment.
  const lastSegment = clean.split('/').pop();
  if (!lastSegment) return null;
  return (
    content.find(
      (c) => c.slug.toLowerCase() === lastSegment || c.rawSlug.toLowerCase() === lastSegment,
    ) ?? null
  );
}

/**
 * The page's path, without leading or trailing slash ('' for the front page). Pages nest under
 * their parents, like WordPress hierarchical permalinks.
 */
export function pagePath(
  slug: string,
  parentOf: (slug: string) => string | undefined,
  frontPage: string,
): string {
  if (slug === frontPage) return '';
  const segments = [slug];
  const seen = new Set(segments);
  for (let parent = parentOf(slug); parent && !seen.has(parent); parent = parentOf(parent)) {
    segments.unshift(parent);
    seen.add(parent);
  }
  return segments.join('/');
}

/** Site-relative URL for a path from `pagePath`: `/` or `/a/b/`. */
export function urlForPath(path: string): string {
  return path ? `/${path}/` : '/';
}

/**
 * Plain-text start of a Markdoc body, like WordPress's excerpts: the first `words` words and " …".
 */
export function excerptOf(markdoc: string, words: number): string {
  const text = markdoc
    .replace(/\{%[\s\S]*?%\}/g, ' ') // tags
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links and images: keep the text
    .replace(/[*_~`#>|]/g, '')
    .replace(/\\(.)/g, '$1')
    .replace(/&nbsp;/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return text.length > words ? `${text.slice(0, words).join(' ')} …` : text.join(' ');
}

/** Navigation between posts, as under a WordPress post: previous/next and related posts. */

export interface NavPost {
  url: string;
  title: string;
  date: Date;
  categories: string[];
}

/** The older and newer neighbours of a post (by date). */
export function adjacentPosts<T extends NavPost>(
  posts: T[],
  url: string,
): { previous: T | undefined; next: T | undefined } {
  const byDate = posts.toSorted((a, b) => a.date.getTime() - b.date.getTime());
  const i = byDate.findIndex((post) => post.url === url);
  if (i < 0) return { previous: undefined, next: undefined };
  return { previous: byDate[i - 1], next: byDate[i + 1] };
}

/** Other posts sharing a category with this one, newest first (Jetpack's "קשור"). */
export function relatedPosts<T extends NavPost>(posts: T[], post: NavPost, limit = 3): T[] {
  return posts
    .filter((other) => other.url !== post.url)
    .filter((other) => other.categories.some((c) => post.categories.includes(c)))
    .toSorted((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, limit);
}

/**
 * The static /page-index.json (built by src/pages/page-index.json.ts): every key a page is known
 * by (its path, WordPress slug and ID, the keys comments are stored under) with its title and URL.
 * The comments API, the comments feed and old ?p= links use it. Read once per Worker instance.
 */

export type PageIndex = Record<string, { title: string; url: string }>;

interface Assets {
  fetch(input: string | URL): Promise<Response>;
}

let cached: Promise<PageIndex> | undefined;

export function getPageIndex(assets: Assets, origin: string): Promise<PageIndex> {
  cached ??= assets.fetch(new URL('/page-index.json', origin)).then(async (res) => {
    if (!res.ok) throw new Error(`page-index.json: ${res.status}`);
    const index: PageIndex = await res.json();
    return index;
  });
  // A failed read is retried on the next request instead of being cached.
  cached.catch(() => (cached = undefined));
  return cached;
}

/** The page a key refers to, if any (own keys only: never Object.prototype's). */
export const findPage = (index: PageIndex, key: string) =>
  Object.hasOwn(index, key) ? index[key] : undefined;

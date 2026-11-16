/**
 * The static /page-index.json (built by src/pages/page-index.json.ts): every key a page is known
 * by (its path, WordPress slug and ID, the keys comments are stored under) with its title and URL.
 * The comments API, the comments feed and old ?p= links use it. Kept once read, for the Worker
 * instance's life.
 */

export type PageIndex = Record<string, { title: string; url: string; noComments?: true }>;

interface Assets {
  fetch(input: string | URL): Promise<Response>;
}

// The index itself, not the promise of it: a promise made while answering one request can't be
// awaited by another once the first has ended (workerd: "This promise was created by a request
// that has since ended"; docs/ROADMAP.md, Known issues). Requests that arrive before the first
// read finishes each read it themselves.
let cached: PageIndex | undefined;

export async function getPageIndex(assets: Assets, origin: string): Promise<PageIndex> {
  if (cached) return cached;
  const res = await assets.fetch(new URL('/page-index.json', origin));
  // A failed read is retried on the next request.
  if (!res.ok) throw new Error(`page-index.json: ${res.status}`);
  const index: PageIndex = await res.json();
  cached = index;
  return index;
}

/** The page a key refers to, if any (own keys only: never Object.prototype's). */
export const findPage = (index: PageIndex, key: string) =>
  Object.hasOwn(index, key) ? index[key] : undefined;

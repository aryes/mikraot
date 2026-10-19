/**
 * Site search (Ctrl+K or the header button) backed by Pagefind's static index, which the build
 * writes to /pagefind/. Pagefind loads when the search opens, so pages carry no search cost until
 * then. A query that finds few pages is also tried in other spellings and without a prefix letter
 * (src/lib/search-variants.ts), exact matches first.
 */
import { queryVariants } from '../lib/search-variants';

interface PagefindResult {
  url: string;
  excerpt: string;
  meta: { title?: string };
}
interface Pagefind {
  search(query: string): Promise<{ results: { id: string; data(): Promise<PagefindResult> }[] }>;
}

const MAX_RESULTS = 8;
/** Fewer exact results than this: the other forms of the query are searched too. */
const FEW_RESULTS = 3;
/** How long a search with no results must stay unchanged before it counts as a miss. */
const MISS_DELAY_MS = 2000;
/** A pause in typing before searching: each search may be several (the other forms). */
const TYPING_PAUSE_MS = 200;
let pagefind: Promise<Pagefind> | null = null;

function isPagefind(value: unknown): value is Pagefind {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'search') === 'function'
  );
}

async function importPagefind(): Promise<Pagefind> {
  const module = await window.loadPagefind?.();
  if (!isPagefind(module)) throw new Error('Pagefind is not available (it exists only in builds)');
  return module;
}

function loadPagefind(): Promise<Pagefind> {
  // A failed load is forgotten, so the next search tries again (a dropped connection on a phone).
  pagefind ??= importPagefind().catch((error: unknown) => {
    pagefind = null;
    throw error;
  });
  return pagefind;
}

/**
 * The query's results, and whether they are only near matches: exact matches first, then, when
 * those are few, the pages its other forms find.
 */
async function find(query: string): Promise<{ results: PagefindResult[]; near: boolean }> {
  const pf = await loadPagefind();
  const exact = (await pf.search(query)).results;
  let found = exact;
  if (exact.length < FEW_RESULTS) {
    // Without prefix letters only when nothing matched: it also misfires (שמיני → מיני).
    const variants = queryVariants(query, { prefixes: exact.length === 0 });
    const others = await Promise.all(variants.map((variant) => pf.search(variant)));
    found = [...exact, ...others.flatMap((search) => search.results)];
  }
  // A page found by several forms once, at its best place; each result's data is a download, so
  // only the first few pages' (no more than an exact search alone would fetch).
  const pages = [...new Map(found.map((result) => [result.id, result])).values()];
  const results = await Promise.all(pages.slice(0, MAX_RESULTS).map((result) => result.data()));
  return { results, near: exact.length === 0 && results.length > 0 };
}

/** Where to go when nothing is found: the topics (the front page) and the recordings. */
const NOTHING_FOUND_LINKS: [string, string][] = [
  ['דף הבית', '/'],
  ['קריאות מוקלטות', '/קריאות-מוקלטות-בנוסח-אשכנז/'],
];

function renderResults(list: HTMLElement, results: PagefindResult[], query: string): void {
  list.replaceChildren();
  if (results.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400';
    empty.textContent = `לא נמצאו תוצאות עבור "${query}". אפשר לנסות מילה אחרת, או להתחיל מכאן:`;
    const links = document.createElement('span');
    links.className = 'mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2';
    for (const [text, href] of NOTHING_FOUND_LINKS) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = text;
      link.className = 'text-brand-strong dark:text-brand font-semibold underline';
      links.append(link);
    }
    empty.append(links);
    list.append(empty);
    return;
  }
  for (const result of results) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = result.url;
    link.className =
      'block rounded-xl px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-950 focus:bg-emerald-50 dark:focus:bg-emerald-950 focus:outline-none';
    const title = document.createElement('p');
    title.className = 'font-bold text-slate-800 dark:text-slate-100';
    title.textContent = result.meta.title ?? result.url;
    const excerpt = document.createElement('p');
    excerpt.className =
      'mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300 [&_mark]:bg-brand/25 [&_mark]:text-inherit';
    excerpt.innerHTML = result.excerpt; // Pagefind escapes content; only <mark> is added.
    link.append(title, excerpt);
    item.append(link);
    list.append(item);
  }
}

function setUpSearch(dialog: HTMLDialogElement): void {
  const input = dialog.querySelector<HTMLInputElement>('input[type="search"]');
  const list = dialog.querySelector<HTMLElement>('[data-search-results]');
  const status = dialog.querySelector<HTMLElement>('[data-search-status]');
  if (!input || !list || !status) return;

  let latest = 0;
  let typingTimer: ReturnType<typeof setTimeout> | undefined;

  // A search that found nothing is reported (src/pages/api/search-misses.ts) once the visitor
  // stops typing, closes the search or leaves the page, so the letters typed on the way to a
  // real query aren't counted. Each query at most once per page view.
  const reported = new Set<string>();
  let miss = '';
  let missTimer: ReturnType<typeof setTimeout> | undefined;
  const reportMiss = () => {
    clearTimeout(missTimer);
    if (miss && !reported.has(miss)) {
      reported.add(miss);
      navigator.sendBeacon('/api/search-misses/', JSON.stringify({ query: miss }));
    }
    miss = '';
  };
  dialog.addEventListener('close', reportMiss);
  addEventListener('pagehide', reportMiss);
  // Phones often background and then kill a tab without a pagehide.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') reportMiss();
  });
  // In a search box the browser's first Escape only clears the text; close the dialog instead.
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close();
    }
  });

  input.addEventListener('input', (event) => {
    // Only what a person typed counts: old /?s= links fill the box with a synthetic event, and
    // crawlers that run scripts open spam search links.
    const typed = event.isTrusted;
    const query = input.value.trim();
    const run = ++latest;
    clearTimeout(missTimer);
    clearTimeout(typingTimer);
    miss = '';
    if (!query) {
      list.replaceChildren();
      status.textContent = '';
      return;
    }
    // Searched once typing pauses (a synthetic event, from an old /?s= link, at once).
    typingTimer = setTimeout(
      () => {
        void find(query)
          .then(({ results, near }) => {
            if (run !== latest) return; // ignore stale responses
            // In the status line, which screen readers announce, not among the results.
            status.textContent = near ? `לא נמצא "${query}" בדיוק. תוצאות קרובות:` : '';
            renderResults(list, results, query);
            // Counted when nothing matched exactly, also when another form found something:
            // those show which spellings src/lib/search-variants.ts should know.
            if ((results.length === 0 || near) && typed && dialog.open) {
              miss = query;
              missTimer = setTimeout(reportMiss, MISS_DELAY_MS);
            }
          })
          .catch((error: unknown) => {
            if (run !== latest) return;
            console.error('Search failed:', error);
            status.textContent = 'החיפוש אינו זמין כרגע.';
          });
      },
      typed ? TYPING_PAUSE_MS : 0,
    );
  });

  const open = () => {
    if (!dialog.open) dialog.showModal();
    input.select();
    // Start loading while the visitor types (a failure shows on the first search).
    loadPagefind().catch(() => undefined);
  };
  for (const button of document.querySelectorAll('[data-open-search]')) {
    button.addEventListener('click', open);
  }
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      open();
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // click on the backdrop
  });

  // WordPress search links (/?s=שווא) open the search with that query.
  const query = new URLSearchParams(location.search).get('s');
  if (query) {
    open();
    input.value = query;
    input.dispatchEvent(new Event('input'));
  }
}

const dialog = document.querySelector<HTMLDialogElement>('dialog[data-search]');
if (dialog) setUpSearch(dialog);

/**
 * Site search (Ctrl+K or the header button) backed by Pagefind's static index, which the build
 * writes to /pagefind/. Pagefind loads on first use, so pages carry no search cost until then.
 */

interface PagefindResult {
  url: string;
  excerpt: string;
  meta: { title?: string };
}
interface Pagefind {
  search(query: string): Promise<{ results: { data(): Promise<PagefindResult> }[] }>;
}

const MAX_RESULTS = 8;
/** How long a search with no results must stay unchanged before it counts as a miss. */
const MISS_DELAY_MS = 2000;
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
  pagefind ??= importPagefind();
  return pagefind;
}

function renderResults(list: HTMLElement, results: PagefindResult[], query: string): void {
  list.replaceChildren();
  if (results.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'px-4 py-6 text-center text-sm text-slate-500';
    empty.textContent = query ? `לא נמצאו תוצאות עבור "${query}"` : '';
    list.append(empty);
    return;
  }
  for (const result of results) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = result.url;
    link.className =
      'block rounded-xl px-4 py-3 hover:bg-emerald-50 focus:bg-emerald-50 focus:outline-none';
    const title = document.createElement('p');
    title.className = 'font-bold text-slate-800';
    title.textContent = result.meta.title ?? result.url;
    const excerpt = document.createElement('p');
    excerpt.className = 'mt-1 text-xs leading-relaxed text-slate-600 [&_mark]:bg-brand/25';
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
    miss = '';
    if (!query) {
      list.replaceChildren();
      return;
    }
    void loadPagefind()
      .then((pf) => pf.search(query))
      .then((search) => Promise.all(search.results.slice(0, MAX_RESULTS).map((r) => r.data())))
      .then((results) => {
        if (run !== latest) return; // ignore stale responses
        renderResults(list, results, query);
        if (results.length === 0 && typed && dialog.open) {
          miss = query;
          missTimer = setTimeout(reportMiss, MISS_DELAY_MS);
        }
      })
      .catch((error: unknown) => {
        console.error('Search failed:', error);
        status.textContent = 'החיפוש אינו זמין כרגע.';
      });
  });

  const open = () => {
    if (!dialog.open) dialog.showModal();
    input.select();
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

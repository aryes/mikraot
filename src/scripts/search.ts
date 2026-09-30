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
    excerpt.className = 'mt-1 text-xs leading-relaxed text-slate-600 [&_mark]:bg-[#8CB65F]/25';
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
  input.addEventListener('input', () => {
    const query = input.value.trim();
    const run = ++latest;
    if (!query) {
      list.replaceChildren();
      return;
    }
    void loadPagefind()
      .then((pf) => pf.search(query))
      .then((search) => Promise.all(search.results.slice(0, MAX_RESULTS).map((r) => r.data())))
      .then((results) => {
        if (run === latest) renderResults(list, results, query); // ignore stale responses
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
}

const dialog = document.querySelector<HTMLDialogElement>('dialog[data-search]');
if (dialog) setUpSearch(dialog);

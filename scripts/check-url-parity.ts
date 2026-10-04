/**
 * URL parity gate for the cutover (docs/CUTOVER.md): every URL the WordPress site publishes, plus
 * the old link forms, must work on the new site: a 200, an expected redirect, or a deliberate 404.
 *
 *   npm run check:urls -- https://mikraot.mikraot-app.workers.dev [--urls extra-urls.txt]
 *
 * URLs come from the live WordPress sitemaps (read-only) and, optionally, a file with one URL or
 * path per line (e.g. Search Console's top pages). Exits non-zero if any URL fails.
 */
import { readFileSync } from 'node:fs';

const LIVE = 'https://mikraot.net';
/** WordPress publishes ~350 URLs; far fewer means the sitemaps weren't read properly. */
const MIN_URLS = 300;

const args = process.argv.slice(2);
const urlsIndex = args.indexOf('--urls');
const urlsFile = urlsIndex === -1 ? undefined : args[urlsIndex + 1];
if (urlsIndex !== -1 && (!urlsFile || urlsFile.startsWith('--'))) {
  throw new Error('--urls needs a file name');
}
const targetArg = args.find(
  (arg, i) => !arg.startsWith('--') && (urlsIndex === -1 || i !== urlsIndex + 1),
);
const target = new URL(targetArg ?? 'http://localhost:4321').origin;

/**
 * Old link forms that no sitemap lists, and how each must behave. "browser": the new site serves
 * the page and a script finishes the job (src/scripts/legacy-links.ts, src/scripts/search.ts), so
 * only a 200 can be checked here.
 */
const OLD_FORMS: Record<string, string> = {
  '/?p=1': 'browser',
  '/?page_id=48': 'browser',
  '/?s=%D7%A9%D7%95%D7%95%D7%90': 'browser',
  '/feed/': 'ok',
  '/comments/feed/': 'ok',
  '/sitemap.rss': 'ok',
  '/sitemap.xml': '/sitemap-index.xml',
  '/page/2/': '/',
  '/robots.txt': 'ok',
  '/2021/08/': 'ok',
  '/author/arye_s/': 'ok',
  '/category/uncategorized/': '/',
};

/** Where each redirect must lead (public/_redirects); anything else is a failure. */
const REDIRECTS: [RegExp, string][] = [
  [/^\/sitemap\.xml$/, '/sitemap-index.xml'],
  [/^\/page\/\d+\/$/, '/'],
  [/^\/(פעילות|חברים)\//, '/'],
  [/^\/category\/uncategorized\/$/, '/'],
];

/** Deliberately not carried over (docs/ROADMAP.md): LearnPress is deferred with the courses. */
const DEFERRED =
  /^\/(courses|lessons|quizzes|questions|lp-profile|lp-checkout|lp-become-a-teacher|lp-term-conditions|instructors?)(\/|$)/;

/** URLs listed in a sitemap (WordPress wraps them in CDATA). */
const locs = (xml: string) =>
  [...xml.matchAll(/<loc>(?:<!\[CDATA\[)?([^<\]]+)/g)].map((m) => m[1] ?? '');

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

async function sitemapUrls(): Promise<string[]> {
  const sitemaps = locs(await fetchText(`${LIVE}/sitemap.xml`)).filter((url) =>
    url.endsWith('.xml'),
  );
  return (await Promise.all(sitemaps.map(async (url) => locs(await fetchText(url))))).flat();
}

const pathOf = (url: string) => {
  const u = new URL(url, LIVE);
  return u.pathname + u.search;
};
const readable = (path: string) => {
  try {
    return decodeURI(path);
  } catch {
    return path;
  }
};

type Outcome = 'ok' | 'browser' | 'redirect' | 'deferred' | 'FAIL';
type Result = { path: string; outcome: Outcome; detail: string };

async function check(path: string): Promise<Result> {
  const shown = readable(path);
  const expected = OLD_FORMS[path];
  // Where this URL must redirect, if anywhere: a 200 instead is a failure too.
  const want = expected?.startsWith('/')
    ? expected
    : REDIRECTS.find(([pattern]) => pattern.test(readable(new URL(path, LIVE).pathname)))?.[1];
  const res = await fetch(target + path, { redirect: 'manual' });
  const isRedirect = res.status >= 300 && res.status < 400;
  if (want && !isRedirect) {
    return {
      path: shown,
      outcome: 'FAIL',
      detail: `${res.status}, expected a redirect to ${want}`,
    };
  }

  if (isRedirect) {
    const location = new URL(res.headers.get('location') ?? '', target + path);
    if (location.origin !== target || location.pathname !== want) {
      return { path: shown, outcome: 'FAIL', detail: `${res.status} → ${location.href}` };
    }
    const next = await fetch(location);
    return next.ok
      ? { path: shown, outcome: 'redirect', detail: `${res.status} → ${want}` }
      : { path: shown, outcome: 'FAIL', detail: `${res.status} → ${want} → ${next.status}` };
  }
  if (res.status === 200) {
    return expected === 'browser'
      ? { path: shown, outcome: 'browser', detail: '200, finished by a script in the browser' }
      : { path: shown, outcome: 'ok', detail: '200' };
  }
  if ((res.status === 404 || res.status === 410) && DEFERRED.test(new URL(path, LIVE).pathname)) {
    return { path: shown, outcome: 'deferred', detail: `${res.status} (LearnPress, deferred)` };
  }
  return { path: shown, outcome: 'FAIL', detail: String(res.status) };
}

const fromSitemaps = await sitemapUrls();
if (fromSitemaps.length < MIN_URLS) {
  throw new Error(
    `Only ${fromSitemaps.length} URLs in the WordPress sitemaps (expected ${MIN_URLS}+)`,
  );
}
const extra = urlsFile
  ? readFileSync(urlsFile, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  : [];
const paths = [...new Set([...fromSitemaps, ...Object.keys(OLD_FORMS), ...extra].map(pathOf))];

// A few at a time: polite to the server, still quick.
const results: Result[] = [];
for (let i = 0; i < paths.length; i += 8) {
  // oxlint-disable-next-line no-await-in-loop -- batches of 8, in order
  results.push(...(await Promise.all(paths.slice(i, i + 8).map(check))));
}

const count = (outcome: Outcome) => results.filter((r) => r.outcome === outcome).length;
console.log(
  `${target}: ${results.length} URLs: ${count('ok')} ok, ${count('browser')} finished in the browser, ` +
    `${count('redirect')} redirected, ${count('deferred')} deferred (LearnPress), ${count('FAIL')} failed`,
);
for (const r of results.filter((x) => x.outcome !== 'ok' && x.outcome !== 'deferred')) {
  console.log(`  ${r.outcome.padEnd(8)} ${r.path}  ${r.detail}`);
}
if (count('FAIL') > 0) process.exit(1);

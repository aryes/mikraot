/**
 * Checks every outside link on the site (YouTube, other sites): they can break long after they were
 * added. Run weekly in CI (.github/workflows/links.yml), or by hand against a running site:
 *   npm run check:links [-- http://localhost:4321]
 * Exits non-zero and lists the broken links if any; internal links are covered by e2e/links.spec.ts.
 */
import { LinkChecker, LinkState } from 'linkinator';

const site = new URL(process.argv[2] ?? 'http://localhost:4321').origin;

// Sites that refuse automated checks; they are reported only when the server is unreachable.
const BOT_BLOCKED = new Set([403, 429]);

const result = await new LinkChecker().check({
  path: `${site}/`,
  recurse: true,
  concurrency: 4,
  timeout: 20_000,
  retry: true,
  retryErrors: true,
  retryErrorsCount: 2,
  // Some sites answer automated checkers with errors but serve browsers normally.
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  // Crawl our pages, and check (without crawling) every link they point to elsewhere.
  linksToSkip: async (link) => /\/(api|cdn-cgi)\//.test(link),
});

const broken = result.links.filter(
  (link) =>
    link.state === LinkState.BROKEN &&
    !link.url.startsWith(site) &&
    !BOT_BLOCKED.has(link.status ?? 0),
);
const external = result.links.filter((link) => !link.url.startsWith(site));
console.log(`Checked ${external.length} outside links on ${site}.`);
for (const link of broken) {
  console.log(
    `BROKEN ${link.status ?? 'no response'} ${link.url}\n  on ${decodeURI(link.parent ?? '?')}`,
  );
}
if (broken.length > 0) process.exit(1);

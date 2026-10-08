/**
 * Compares every page of the new build with the live WordPress site: content text and counts of
 * the elements that carry meaning (links, images, headings, lists, tables, audio, collapsibles,
 * colour highlights). Live pages are fetched read-only and cached in .migration/live/.
 *
 * Run after a build: npx tsx scripts/compare-with-live.ts [--refresh]
 * Writes .migration/compare-report.md and exits non-zero if any page differs.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
// WordPress "texturizes" quotes and dashes, and this site uses Hebrew geresh/gershayim:
// text is also compared without those differences.
import { plainTypography } from './content/typography.ts';

const LIVE = 'https://mikraot.net';
const CACHE = '.migration/live';
const refresh = process.argv.includes('--refresh');

/**
 * The built site's content pages, from its sitemap (so exactly what would be deployed is
 * compared). Archive listings (month, category) have no page content, and "מה חדש" is new in this
 * site; e2e/archives.spec.ts covers them.
 */
const NOT_CONTENT = /^\/(\d{4}\/\d{2}|category\/[^/]+|מה-חדש)\/$/;
const pageUrls = [
  ...readFileSync('dist/client/sitemap-0.xml', 'utf8').matchAll(
    /<loc>https:\/\/mikraot\.net([^<]*)<\/loc>/g,
  ),
]
  .map((m) => decodeURI(m[1] ?? '/'))
  .filter((url) => !NOT_CONTENT.test(url));

type Doc = ReturnType<typeof parseHTML>['document'];
type Root = NonNullable<ReturnType<Doc['querySelector']>>;

/** Plugin widgets differ in markup: count them, then remove them so text and links compare. */
const WIDGETS = {
  live: {
    collapses: 'a.bg-showmore-plg-link',
    audio: '.compact_audio_player_wrapper',
    noise: 'input, script, style, .sharedaddy, .jp-relatedposts',
  },
  ours: { collapses: '.collapse-toggle-btn', audio: '.inline-audio-btn', noise: 'script, style' },
};

/** Colour of a text run: inline style, WordPress palette class, or this site's mark classes. */
function highlightKind(el: Root): string | null {
  const style = (el.getAttribute('style') ?? '').toLowerCase().replace(/\s/g, '');
  const cls = el.getAttribute('class') ?? '';
  const color = /(?:^|;)color:(#[0-9a-f]{3,6})/.exec(style)?.[1];
  if (color && ['#ff6600', '#ff7304', '#ff6a02', '#f5ab09'].includes(color)) return 'orange';
  if (cls.includes('has-luminous-vivid-orange-color') || cls.includes('mark-highlight')) {
    return 'orange';
  }
  if (cls.includes('mark-muted')) return 'gray';
  if (cls.includes('mark-silent')) return 'silent';
  if (color === '#c3c3c3') return 'gray';
  if (color === '#d1cfcf') return 'silent';
  return null;
}

function metrics(root: Root, side: keyof typeof WIDGETS) {
  const count = (selector: string) => root.querySelectorAll(selector).length;
  const widgets = WIDGETS[side];
  const collapses = count(widgets.collapses);
  const audio = count(widgets.audio);
  for (const el of root.querySelectorAll(
    `${widgets.collapses}, ${widgets.audio}, ${widgets.noise}`,
  )) {
    el.remove();
  }
  // Block boundaries and line breaks separate words visually even when the HTML has no
  // whitespace there (the build output is compressed), so they count as spaces.
  for (const el of root.querySelectorAll(
    'p, li, ul, ol, h1, h2, h3, h4, h5, h6, table, tr, td, th, div, blockquote, br',
  )) {
    el.before(' ');
    el.after(' ');
  }
  const highlights: Record<string, number> = {};
  for (const el of root.querySelectorAll('span, mark')) {
    const kind = highlightKind(el);
    if (kind) highlights[kind] = (highlights[kind] ?? 0) + 1;
  }
  return {
    text: (root.textContent ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim(),
    collapses,
    audio,
    links: count('a[href]'),
    // Not the video posters: the new site shows a picture until a video is played, where WordPress
    // embedded the player at once.
    images: [...root.querySelectorAll('img')].filter(
      (img) => !img.closest('picture')?.parentElement?.querySelector('[data-video-id]'),
    ).length,
    headings: count('h1, h2, h3, h4, h5, h6'),
    listItems: count('li'),
    tables: count('table'),
    ...highlights,
  };
}

function textDifference(live: string, ours: string): string | null {
  if (live === ours) return null;
  const [x, y] = [plainTypography(live), plainTypography(ours)];
  if (x === y) return 'text: typography only (’ ” – ׳ ״)';
  // Spacing that differs, but no words joined or split.
  if (x.replace(/\s+/g, ' ') === y.replace(/\s+/g, ' ')) return 'text: whitespace only';
  let i = 0;
  while (i < x.length && x[i] === y[i]) i++;
  return `TEXT differs at ${i}: live "…${x.slice(i, i + 50)}" vs ours "…${y.slice(i, i + 50)}"`;
}

async function livePage(url: string): Promise<string> {
  mkdirSync(CACHE, { recursive: true });
  const file = `${CACHE}/${encodeURIComponent(url)}.html`;
  if (!refresh && existsSync(file)) return readFileSync(file, 'utf8');
  const res = await fetch(LIVE + encodeURI(url));
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const html = await res.text();
  writeFileSync(file, html);
  return html;
}

const rows: string[] = [];
let differing = 0;
for (const url of pageUrls) {
  const live = parseHTML(await livePage(url)).document.querySelector('.entry-content');
  const ours = parseHTML(
    readFileSync(`dist/client${url}index.html`, 'utf8'),
  ).document.querySelector('.wp-content-rendered');
  if (!live || !ours) {
    rows.push(`| ${url} | missing content container (live: ${!!live}, ours: ${!!ours}) |`);
    differing++;
    continue;
  }
  const a: Record<string, string | number> = metrics(live, 'live');
  const b: Record<string, string | number> = metrics(ours, 'ours');
  const diffs = [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((k) => k !== 'text' && a[k] !== b[k])
    .map((k) => `${k} ${a[k] ?? 0}→${b[k] ?? 0}`);
  const text = textDifference(String(a['text']), String(b['text']));
  if (text) diffs.push(text);
  // Typography and whitespace differences are deliberate (Hebrew geresh and gershayim): reported,
  // not counted.
  if (diffs.some((diff) => !diff.startsWith('text: '))) differing++;
  rows.push(`| ${url} | ${diffs.length === 0 ? 'same' : diffs.join('; ')} |`);
}

const report = `# Live vs new: ${pageUrls.length} pages, ${differing} differ\n\n| Page | Result |\n| --- | --- |\n${rows.join('\n')}\n`;
writeFileSync('.migration/compare-report.md', report);
console.log(report);
process.exitCode = differing > 0 ? 1 : 0;

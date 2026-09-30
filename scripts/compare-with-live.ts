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
import { sitePages } from '../src/lib/site.ts';

const LIVE = 'https://mikraot.net';
const CACHE = '.migration/live';
const refresh = process.argv.includes('--refresh');

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

/** WordPress "texturizes" quotes and dashes; text is also compared without that difference. */
const plainTypography = (text: string) =>
  text.replace(/[’‘]/g, "'").replace(/[”“]/g, '"').replace(/–/g, '-');

/** Colour of a text run: from an inline style, a WordPress palette class, or a <mark>. */
function highlightKind(el: Root): string | null {
  const style = (el.getAttribute('style') ?? '').toLowerCase().replace(/\s/g, '');
  const cls = el.getAttribute('class') ?? '';
  const color = /(?:^|;)color:(#[0-9a-f]{3,6})/.exec(style)?.[1];
  if (color && ['#ff6600', '#ff7304', '#ff6a02', '#f5ab09'].includes(color)) return 'orange';
  if (cls.includes('has-luminous-vivid-orange-color')) return 'orange';
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
    images: count('img'),
    headings: count('h1, h2, h3, h4, h5, h6'),
    listItems: count('li'),
    tables: count('table'),
    ...highlights,
  };
}

function textDifference(live: string, ours: string): string | null {
  if (live === ours) return null;
  const [x, y] = [plainTypography(live), plainTypography(ours)];
  if (x === y) return 'text: typography only (’ ” –)';
  if (x.replace(/\s/g, '') === y.replace(/\s/g, '')) return 'text: whitespace only';
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
for (const page of sitePages) {
  const live = parseHTML(await livePage(page.url)).document.querySelector('.entry-content');
  const ours = parseHTML(
    readFileSync(`dist/client${page.url}index.html`, 'utf8'),
  ).document.querySelector('.wp-content-rendered');
  if (!live || !ours) {
    rows.push(`| ${page.url} | missing content container (live: ${!!live}, ours: ${!!ours}) |`);
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
  if (diffs.length > 0) differing++;
  rows.push(`| ${page.url} | ${diffs.length === 0 ? 'same' : diffs.join('; ')} |`);
}

const report = `# Live vs new: ${sitePages.length} pages, ${differing} differ\n\n| Page | Result |\n| --- | --- |\n${rows.join('\n')}\n`;
writeFileSync('.migration/compare-report.md', report);
console.log(report);
process.exitCode = differing > 0 ? 1 : 0;

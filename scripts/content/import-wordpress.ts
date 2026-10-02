/**
 * Imports the WordPress export into the site's content files (one-time migration; re-runnable
 * until cutover). Reads .migration/wp-export.json (scripts/wp-export.php) and writes:
 * - src/content/pages/<slug>.mdoc  pages and posts: frontmatter + Markdoc body
 * - src/data/site.json              site title, tagline, copyright, front page
 * - src/data/menu.json              the main menu
 * Every conversion is verified (text and element counts); any difference aborts the import.
 *
 * Run: npx tsx scripts/content/import-wordpress.ts
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { stringify } from 'yaml';
import { hebrewTypography } from './typography.ts';
import { verifyConversion } from './verify-conversion.ts';
import { wpToMarkdoc } from './wp-to-markdoc.ts';

interface WpPost {
  id: number;
  type: string;
  status: string;
  title: string;
  slug: string;
  parentId: number;
  menuOrder: number;
  date: string;
  modified: string;
  excerpt: string;
  content: string;
  url: string | null;
  author: { name: string; slug: string };
  categories: string[];
}
interface WpMenuItem {
  id: number;
  title: string;
  url: string;
  parentId: number;
  order: number;
}
interface WpExport {
  site: { title: string; tagline: string; frontPageId: number };
  posts: WpPost[];
  categories: { slug: string; name: string }[];
  menus: { name: string; locations: string[]; items: WpMenuItem[] }[];
}

const OUT = 'src/content/pages';
/** LearnPress pages are deferred with the courses (docs/ROADMAP.md). */
const LEARNPRESS_PAGES = new Set([
  'courses',
  'lp-profile',
  'lp-checkout',
  'lp-become-a-teacher',
  'lp-term-conditions',
  'instructor',
  'instructors',
]);

const data: WpExport = JSON.parse(readFileSync('.migration/wp-export.json', 'utf8'));
const seo: Record<string, { title: string; description?: string; ogImage?: string }> = JSON.parse(
  readFileSync('.migration/seo.json', 'utf8'),
);

const decodeEntities = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ');

const posts = data.posts.filter(
  (p) => (p.type === 'page' || p.type === 'post') && !LEARNPRESS_PAGES.has(p.slug),
);
const byId = new Map(posts.map((p) => [p.id, p]));
/** File name (and slug) of each post; drafts without a slug get one from their ID. */
const fileSlug = (p: WpPost) => p.slug || `draft-${p.id}`;

/** Site path of a published page from its WordPress permalink ('' for the front page). */
function sitePath(p: WpPost): string {
  if (p.id === data.site.frontPageId) return '';
  return decodeURI(new URL(p.url ?? '', 'https://mikraot.net').pathname).replace(/^\/|\/$/g, '');
}

/** Rewrites a mikraot.net link ("about/", "?page_id=48", "x/#anchor") to a site URL. */
function siteLink(pathAndQuery: string): string {
  const [, path = '', rest = ''] = /^([^?#]*)(.*)$/.exec(pathAndQuery) ?? [];
  const clean = path.replace(/^\/+|\/+$/g, '');
  const id = clean ? undefined : /^\?(?:page_id|p)=(\d+)(#.*)?$/.exec(rest);
  const target = id ? byId.get(Number(id[1])) : undefined;
  if (id && target?.status === 'publish') {
    const targetPath = sitePath(target);
    return `${targetPath ? `/${targetPath}/` : '/'}${id[2] ?? ''}`;
  }
  return `/${clean ? `${clean}/` : ''}${rest}`;
}

/**
 * The post's calendar day in Israel (WordPress shows the date only; Keystatic stores YYYY-MM-DD).
 * Never-published drafts have the date 0000-00-00 in WordPress, so they use the last edit.
 */
function israelDay(p: WpPost): string {
  const gmt = p.date.startsWith('0000') ? p.modified : p.date;
  return new Date(`${gmt.replace(' ', 'T')}Z`).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Jerusalem',
  });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/** Text from WordPress: entities decoded, Hebrew typography applied. */
const typeset = (text: string) => hebrewTypography(decodeEntities(text));

const failures: string[] = [];
for (const p of posts) {
  const body = wpToMarkdoc(p.content, { siteLink });
  const diffs = verifyConversion(p.content, body);
  if (diffs.length > 0) failures.push(`${fileSlug(p)}: ${diffs.join('; ')}`);

  const parent = byId.get(p.parentId);
  const pageSeo = p.status === 'publish' ? seo[sitePath(p)] : undefined;
  const frontmatter = {
    title: typeset(p.title),
    wpId: p.id,
    kind: p.type,
    ...(parent && { parent: fileSlug(parent) }),
    order: p.menuOrder,
    date: israelDay(p),
    ...(p.categories.length > 0 && { categories: p.categories }),
    ...(p.excerpt && { excerpt: p.excerpt }),
    ...(p.status !== 'publish' && { draft: true }),
    // SEO tags stay exactly as on the live site (search engines already know them).
    ...(pageSeo && { seo: pageSeo }),
  };
  writeFileSync(`${OUT}/${fileSlug(p)}.mdoc`, `---\n${stringify(frontmatter)}---\n\n${body}`);
}
if (failures.length > 0) {
  throw new Error(`Conversion differs from WordPress for:\n${failures.join('\n')}`);
}

const frontPage = byId.get(data.site.frontPageId);
if (!frontPage) throw new Error('Front page not found in the export');
writeFileSync(
  'src/data/site.json',
  `${JSON.stringify(
    {
      title: typeset(data.site.title),
      tagline: typeset(data.site.tagline),
      copyright: '© מקראות, קריאה בתורה – הגיה דקדוק וטעמים.',
      frontPage: fileSlug(frontPage),
      // The site has one author; posts show this byline and link to the author's archive.
      author: frontPage.author,
      categories: data.categories.map(({ slug, name }) => ({ slug, name: typeset(name) })),
    },
    null,
    2,
  )}\n`,
);

const menu = data.menus.find((m) => m.locations.includes('primary'));
if (!menu) throw new Error('Primary menu not found in the export');
const menuUrl = (url: string) => {
  if (!url) return null;
  const u = new URL(url, 'https://mikraot.net');
  if (u.hostname !== 'mikraot.net' && u.hostname !== 'www.mikraot.net') return url;
  return siteLink(
    `${decodeURI(u.pathname)
      .replace(/^\/staging\/4160/, '')
      .replace(/^\//, '')}${u.search}${u.hash}`,
  );
};
writeFileSync(
  'src/data/menu.json',
  `${JSON.stringify(
    menu.items.map((i) => ({
      id: i.id,
      title: typeset(i.title),
      url: menuUrl(i.url),
      parentId: i.parentId,
      order: i.order,
    })),
    null,
    2,
  )}\n`,
);

const drafts = posts.filter((p) => p.status !== 'publish').length;
console.log(
  `Imported ${posts.length} pages/posts (${drafts} drafts), menu (${menu.items.length} items).`,
);

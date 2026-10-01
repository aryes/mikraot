/**
 * Captures the SEO head tags that the live WordPress site (All in One SEO) renders for each page,
 * so the new site keeps the same titles and descriptions. Read-only GET requests. The result feeds
 * the import (import-wordpress.ts), which writes it into each page's frontmatter.
 *
 * Run: npm run seo:fetch   (needs .migration/wp-export.json; writes .migration/seo.json)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const LIVE = 'https://mikraot.net';

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/** First value of a meta tag, matched by name or property. */
function meta(html: string, key: string): string | undefined {
  const tag = new RegExp(`<meta[^>]+(?:name|property)="${key}"[^>]*>`, 'i').exec(html)?.[0];
  const content = tag && /content="([^"]*)"/i.exec(tag)?.[1];
  return content ? decodeEntities(content).trim() : undefined;
}

export interface PageSeo {
  title: string;
  description?: string;
  ogImage?: string;
}

/** Published pages and posts: their WordPress permalink paths. */
const exported: { posts: { type: string; status: string; url: string | null }[] } = JSON.parse(
  readFileSync('.migration/wp-export.json', 'utf8'),
);
const paths = exported.posts
  .filter((p) => (p.type === 'page' || p.type === 'post') && p.status === 'publish' && p.url)
  .map((p) => decodeURI(new URL(p.url ?? '').pathname));

const result: Record<string, PageSeo> = {};
for (const url of paths) {
  const res = await fetch(LIVE + encodeURI(url));
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const html = await res.text();
  const title = /<title>([^<]*)<\/title>/i.exec(html)?.[1];
  if (!title) throw new Error(`${url}: no <title>`);

  const description = meta(html, 'description');
  // Jetpack serves images through its CDN (i0.wp.com); the new site serves them itself.
  const ogImage = meta(html, 'og:image')
    ?.replace(/^https:\/\/i\d\.wp\.com\/mikraot\.net/, '')
    .replace(/\?.*$/, '');
  const key = url.replace(/^\/|\/$/g, '');
  result[key] = {
    title: decodeEntities(title).trim(),
    ...(description && { description }),
    ...(ogImage?.startsWith('/wp-content/') && { ogImage }),
  };
  console.log(url, '→', result[key]?.title);
}
writeFileSync('.migration/seo.json', JSON.stringify(result, null, 2) + '\n');
console.log(`Saved SEO for ${Object.keys(result).length} pages.`);

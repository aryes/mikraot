import { parse, type Node } from '@markdoc/markdoc';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Content checks: mistakes an edit (in Keystatic or by hand) can introduce that the build would not
 * catch on its own. Links between pages are checked by the browser tests (e2e/links.spec.ts).
 */
const PAGES = 'src/content/pages';
const text = (value: unknown) => (typeof value === 'string' ? value : undefined);

const pages = readdirSync(PAGES)
  .filter((file) => file.endsWith('.mdoc'))
  .map((file) => {
    // Markdoc separates the frontmatter itself (any line endings).
    const ast = parse(readFileSync(join(PAGES, file), 'utf8'));
    return { file, ast, frontmatter: text(ast.attributes['frontmatter']) ?? '' };
  });

/** Every node of a page, depth first. */
function* walk(node: Node): Generator<Node> {
  yield node;
  for (const child of node.children) yield* walk(child);
}

const each = (pick: (node: Node) => string | undefined) =>
  pages.flatMap(({ file, ast }) =>
    [...walk(ast)].map(pick).flatMap((value) => (value === undefined ? [] : [{ file, value }])),
  );

const recordings = each((node) =>
  node.type === 'tag' && node.tag === 'audio' ? text(node.attributes['src']) : undefined,
);
const videoIds = each((node) =>
  node.type === 'tag' && node.tag === 'youtube' ? text(node.attributes['videoId']) : undefined,
);
const links = each((node) => (node.type === 'link' ? text(node.attributes['href']) : undefined));
const images = each((node) => (node.type === 'image' ? text(node.attributes['src']) : undefined));
// The social-share picture in each page's SEO settings (seo.ogImage, a free-text field).
const shareImages = pages.flatMap(({ file, frontmatter }) => {
  const value = /^\s*ogImage:\s*['"]?([^'"\s]+)/m.exec(frontmatter)?.[1];
  return value ? [{ file, value }] : [];
});

/** The file a site path names, or null if the path can't be decoded. */
function publicFile(path: string): string | null {
  try {
    return join('public', decodeURI(path.replace(/[?#].*$/, '')));
  } catch {
    return null;
  }
}

describe('content', () => {
  it('every recording, image and file a page uses exists in public/', () => {
    const files = [...recordings, ...images, ...links, ...shareImages].filter(({ value }) =>
      value.startsWith('/wp-content/'),
    );
    // The rules really see the recordings and share pictures.
    expect(recordings.length).toBeGreaterThan(40);
    expect(shareImages.length).toBeGreaterThan(0);
    const missing = files.filter(({ value }) => {
      const file = publicFile(value);
      return file === null || !existsSync(file);
    });
    expect(missing).toEqual([]);
  });

  it('every video has a well-formed YouTube id', () => {
    expect(videoIds.length).toBeGreaterThan(0);
    expect(videoIds.filter(({ value }) => !/^[\w-]{11}$/.test(value))).toEqual([]);
  });

  it('no links in the old WordPress forms or to the site by its full address', () => {
    // Internal links are site-relative (/page/), so they also work on the test site.
    const old = links.filter(({ value }) =>
      /[?&](?:page_id|p)=\d|\/wp-admin|^https?:\/\/(?:www\.)?mikraot\.net/.test(value),
    );
    expect(links.length).toBeGreaterThan(100);
    expect(old).toEqual([]);
  });

  it('no empty headings', () => {
    const empty = pages.flatMap(({ file, ast }) =>
      [...walk(ast)]
        .filter((node) => node.type === 'heading')
        .filter((heading) =>
          [...walk(heading)].every(
            (n) => n.type !== 'text' || !n.attributes['content']?.toString().trim(),
          ),
        )
        .map(() => file),
    );
    expect(empty).toEqual([]);
  });
});

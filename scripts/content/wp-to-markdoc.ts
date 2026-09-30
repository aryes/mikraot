/**
 * Converts WordPress post HTML (Gutenberg + shortcodes) into Markdoc for the site's content files.
 *
 * WordPress constructs map to Markdoc tags that Keystatic can edit and Astro renders:
 * - colour spans      -> {% highlight %} (orange: taught letter), {% muted %} (grey), {% silent %}
 * - [bg_collapse]     -> {% collapse %} inline, or as a block when it wraps whole paragraphs
 * - [sc_embed_player] -> {% audio src="…" /%}
 * - YouTube embeds    -> {% youtube videoId="…" /%}; latest-posts block -> {% latest-posts /%}
 * - centred blocks    -> {% center %}; heading anchors -> {% #id %}; <kbd> -> {% kbd %}
 */
// Markdoc is CommonJS: under Node only its default export exists, so members are used through it.
// oxlint-disable import/no-named-as-default-member
import Markdoc, { type NodeType } from '@markdoc/markdoc';
import { parseHTML } from 'linkedom';

const { Ast } = Markdoc;
type MdNode = InstanceType<typeof Ast.Node>;
type Doc = ReturnType<typeof parseHTML>['document'];
type El = NonNullable<ReturnType<Doc['querySelector']>>;
type DomNode = El['childNodes'][number];

export interface ConvertOptions {
  /** Rewrites a mikraot.net link path (e.g. "about/", "?page_id=48") to a site URL. */
  siteLink: (pathAndQuery: string) => string;
}

export class UnsupportedContentError extends Error {}

const node = (type: NodeType, attributes: Record<string, unknown> = {}, children: MdNode[] = []) =>
  new Ast.Node(type, attributes, children);

function tag(
  name: string,
  attributes: Record<string, unknown>,
  children: MdNode[],
  inline: boolean,
) {
  const n = new Ast.Node('tag', attributes, children, name);
  n.inline = inline;
  return n;
}

/**
 * Escapes characters Markdoc's formatter leaves alone but its parser would read as syntax
 * (the formatter itself escapes * _ ~ inside emphasis, and # or > at the start of a line).
 * `{%` cannot be escaped in Markdoc at all, so text containing it is rejected.
 */
function text(content: string): MdNode {
  if (content.includes('{%') || content.includes('%}')) {
    throw new UnsupportedContentError(`Text contains Markdoc tag delimiters: ${content}`);
  }
  return node('text', { content: content.replace(/[\\`[\]<]/g, '\\$&') });
}

const YOUTUBE_ID =
  /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/;
const SITE_URL = /^https?:\/\/(?:www\.)?mikraot\.net(?:\/staging\/4160)?\/?(.*)$/;

function shortcodeAttr(attrs: string, name: string): string {
  const value = new RegExp(`(?:^|\\s)${name}=["']([^"']*)["']`).exec(attrs)?.[1] ?? '';
  return value.replace(/&nbsp;/g, ' ').trim();
}

const collapseAttrsOf = (attrs: string) =>
  `data-expand="${shortcodeAttr(attrs, 'expand_text')}" data-collapse="${shortcodeAttr(attrs, 'collapse_text')}"`;

/**
 * A block collapse opens in a paragraph of its own and wraps whole blocks. It closes either in a
 * paragraph of its own, or at the end of its last paragraph ("…text[/bg_collapse]</p>").
 */
const BLOCK_COLLAPSE =
  /<p>\s*\[bg_collapse([^\]]*)\]\s*<\/p>([\s\S]*?)(<p>\s*\[\/bg_collapse\]\s*<\/p>|\[\/bg_collapse\]\s*<\/p>)/g;

/** Replaces shortcodes, embeds and dynamic blocks with placeholder elements before parsing. */
export function preprocess(html: string): string {
  return html
    .replace(/https?:\/\/(?:www\.)?mikraot\.net(?:\/staging\/4160)?\/wp-content\//g, '/wp-content/')
    .replace(/<!-- wp:latest-posts[^>]*\/-->/g, '<x-latest-posts></x-latest-posts>')
    .replace(/<!-- \/?wp:[\s\S]*?-->/g, '')
    .replace(BLOCK_COLLAPSE, (_m, attrs: string, inner: string, close: string) => {
      const content = close.startsWith('<p>') ? inner : `${inner}</p>`;
      return `<x-collapse-block ${collapseAttrsOf(attrs)}>${content}</x-collapse-block>`;
    })
    .replace(
      /\[bg_collapse([^\]]*)\]([\s\S]*?)\[\/bg_collapse\]/g,
      (_m, attrs: string, inner: string) =>
        `<x-collapse ${collapseAttrsOf(attrs)}>${inner}</x-collapse>`,
    )
    .replace(
      /\[sc_embed_player\s+fileurl=["']([^"']+)["'][^\]]*\]/g,
      (_m, src: string) => `<x-audio data-src="${src}"></x-audio>`,
    )
    .replace(
      /<figure[^>]*class="[^"]*wp-block-embed[^"]*"[^>]*>[\s\S]*?(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s<"')]+)[\s\S]*?<\/figure>/gi,
      (match, url: string) => {
        const id = YOUTUBE_ID.exec(url)?.[1];
        return id ? `<x-youtube data-id="${id}"></x-youtube>` : match;
      },
    )
    .replace(
      /<p>\s*(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[^\s<"')]+)\s*<\/p>/gi,
      (match, url: string) => {
        const id = YOUTUBE_ID.exec(url)?.[1];
        return id ? `<x-youtube data-id="${id}"></x-youtube>` : match;
      },
    );
}

/** Semantic colour of a span/mark, or null for colours that carry no meaning. */
export function colourMark(el: El): 'highlight' | 'muted' | 'silent' | null {
  const style = (el.getAttribute('style') ?? '').toLowerCase().replace(/\s/g, '');
  const color = /(?:^|;)color:(#[0-9a-f]{3,6})/.exec(style)?.[1];
  if (color && ['#ff6600', '#ff7304', '#ff6a02', '#f5ab09'].includes(color)) return 'highlight';
  if ((el.getAttribute('class') ?? '').includes('has-luminous-vivid-orange-color'))
    return 'highlight';
  if (color === '#c3c3c3') return 'muted';
  if (color === '#d1cfcf') return 'silent';
  return null;
}

const isElement = (n: DomNode): n is El => n.nodeType === 1;
const INLINE_TAGS = new Set([
  'strong',
  'b',
  'em',
  'i',
  's',
  'del',
  'a',
  'span',
  'mark',
  'br',
  'kbd',
  'x-audio',
  'x-collapse',
  'img',
  'sup',
  'sub',
  'u',
]);

function isInline(n: DomNode): boolean {
  return !isElement(n) || INLINE_TAGS.has(n.localName);
}

/** Converts inline DOM nodes; whitespace is collapsed the way a browser renders it. */
function inlines(nodes: DomNode[], options: ConvertOptions): MdNode[] {
  const out: MdNode[] = [];
  for (const n of nodes) {
    if (!isElement(n)) {
      if (n.nodeType === 3) {
        const content = (n.textContent ?? '').replace(/[ \t\r\n]+/g, ' ');
        if (content) out.push(text(content));
      }
      continue;
    }
    const kids = () => inlines([...n.childNodes], options);
    switch (n.localName) {
      case 'strong':
      case 'b':
        out.push(node('strong', {}, kids()));
        break;
      case 'em':
      case 'i':
        out.push(node('em', {}, kids()));
        break;
      case 's':
      case 'del':
        out.push(node('s', {}, kids()));
        break;
      case 'br':
        out.push(node('hardbreak'));
        break;
      case 'a': {
        const href = n.getAttribute('href') ?? '';
        const site = SITE_URL.exec(href);
        // Link titles (tooltips) are dropped: in this content they only repeat the text or URL.
        out.push(node('link', { href: site ? options.siteLink(site[1] ?? '') : href }, kids()));
        break;
      }
      case 'span':
      case 'mark': {
        const mark = colourMark(n);
        if (mark) out.push(tag(mark, {}, kids(), true));
        else out.push(...kids());
        break;
      }
      case 'kbd':
        out.push(tag('kbd', {}, [text((n.textContent ?? '').replace(/ /g, ' '))], true));
        break;
      case 'x-audio':
        out.push(tag('audio', { src: n.getAttribute('data-src') }, [], true));
        break;
      case 'x-collapse':
        out.push(tag('collapse', collapseAttrs(n), kids(), true));
        break;
      case 'sup':
      case 'sub':
      case 'u':
        throw new UnsupportedContentError(`<${n.localName}> is not supported`);
      default:
        throw new UnsupportedContentError(`Unexpected inline <${n.localName}>`);
    }
  }
  return out;
}

function collapseAttrs(el: El): Record<string, string> {
  const expandText = el.getAttribute('data-expand') ?? '';
  const collapseText = el.getAttribute('data-collapse') ?? '';
  return { ...(expandText && { expandText }), ...(collapseText && { collapseText }) };
}

/** Trims the whitespace a browser ignores at the start and end of a block's inline content. */
function trimInline(children: MdNode[]): MdNode[] {
  const first = children[0];
  const last = children.at(-1);
  if (first?.type === 'text')
    first.attributes['content'] = String(first.attributes['content']).trimStart();
  if (last?.type === 'text')
    last.attributes['content'] = String(last.attributes['content']).trimEnd();
  while (children[0]?.type === 'hardbreak') children.shift();
  while (children.at(-1)?.type === 'hardbreak') children.pop();
  return children.filter((c) => c.type !== 'text' || c.attributes['content'] !== '');
}

function hasText(children: MdNode[]): boolean {
  return children.some((c) => c.type !== 'hardbreak');
}

function paragraph(children: MdNode[]): MdNode | null {
  const content = trimInline(children);
  return hasText(content) ? node('paragraph', {}, [node('inline', {}, content)]) : null;
}

function list(el: El, options: ConvertOptions): MdNode {
  const items = [...el.children]
    .filter((c) => c.localName === 'li')
    .map((li) => {
      const inlineNodes = [...li.childNodes].filter(isInline);
      const nested = [...li.children].filter((c) => c.localName === 'ul' || c.localName === 'ol');
      const content = trimInline(inlines(inlineNodes, options));
      return node('item', {}, [
        ...(hasText(content) ? [node('inline', {}, content)] : []),
        ...nested.map((l) => list(l, options)),
      ]);
    });
  return node(
    'list',
    { ordered: el.localName === 'ol', marker: el.localName === 'ol' ? '.' : '-' },
    items,
  );
}

/**
 * In table cells WordPress puts a line break between a letter and its audio button. A line that
 * starts with a tag reads as a block tag in Markdoc, so the break is dropped here and CSS places
 * the button under the letter instead.
 */
function withoutBreakBeforeAudio(children: MdNode[]): MdNode[] {
  return children.filter((child, i) => {
    const next = children[i + 1];
    return !(child.type === 'hardbreak' && next?.type === 'tag' && next.tag === 'audio');
  });
}

function table(el: El, options: ConvertOptions): MdNode {
  const row = (tr: El) =>
    node(
      'tr',
      {},
      [...tr.children].map((cell) =>
        node(cell.localName === 'th' ? 'th' : 'td', {}, [
          node(
            'inline',
            {},
            withoutBreakBeforeAudio(trimInline(inlines([...cell.childNodes], options))),
          ),
        ]),
      ),
    );
  const head = el.querySelector('thead');
  const bodyRows = [...el.querySelectorAll('tr')].filter(
    (tr) => tr.parentElement?.localName !== 'thead',
  );
  return node('table', {}, [
    ...(head ? [node('thead', {}, [...head.querySelectorAll('tr')].map(row))] : []),
    node('tbody', {}, bodyRows.map(row)),
  ]);
}

/** Converts block-level DOM nodes, grouping runs of inline content into paragraphs. */
function blocks(nodes: DomNode[], options: ConvertOptions): MdNode[] {
  const out: { node: MdNode; centred: boolean }[] = [];
  let pending: DomNode[] = [];
  const flush = () => {
    const p = paragraph(inlines(pending, options));
    if (p) out.push({ node: p, centred: false });
    pending = [];
  };
  for (const n of nodes) {
    if (isInline(n)) {
      pending.push(n);
      continue;
    }
    flush();
    if (!isElement(n)) continue;
    const centred = (n.getAttribute('class') ?? '').includes('has-text-align-center');
    const push = (m: MdNode | null) => m && out.push({ node: m, centred });
    switch (n.localName) {
      case 'p':
        push(paragraph(inlines([...n.childNodes], options)));
        break;
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6': {
        const heading = node('heading', { level: Number(n.localName[1]) }, [
          node('inline', {}, trimInline(inlines([...n.childNodes], options))),
        ]);
        const id = n.getAttribute('id');
        // Anchors (targets of in-page links) are kept as `anchor`: Markdoc's built-in `id`
        // must start with a Latin letter, and several anchors are Hebrew.
        if (id) heading.annotations = [{ type: 'attribute', name: 'anchor', value: id }];
        push(heading);
        break;
      }
      case 'ul':
      case 'ol':
        push(list(n, options));
        break;
      case 'table':
        // As a {% table %} tag, so cells can hold line breaks (pipe tables cannot).
        push(tag('table', {}, [table(n, options)], false));
        break;
      case 'figure':
        for (const b of blocks([...n.childNodes], options)) out.push({ node: b, centred });
        break;
      case 'blockquote': {
        // WordPress quote block: the quote text sits in <cite>, with an empty <p> before it.
        const cite = n.querySelector('cite');
        const inner = cite ? [...cite.childNodes] : [...n.childNodes];
        push(node('blockquote', {}, blocks(inner, options)));
        break;
      }
      case 'x-youtube':
        push(tag('youtube', { videoId: n.getAttribute('data-id') }, [], false));
        break;
      case 'x-latest-posts':
        push(tag('latest-posts', {}, [], false));
        break;
      case 'x-collapse-block':
        push(tag('collapse', collapseAttrs(n), blocks([...n.childNodes], options), false));
        break;
      case 'div':
        for (const b of blocks([...n.childNodes], options)) out.push({ node: b, centred });
        break;
      default:
        throw new UnsupportedContentError(`Unexpected block <${n.localName}>`);
    }
  }
  flush();

  // Consecutive centred blocks share one {% center %} wrapper.
  const result: MdNode[] = [];
  for (const { node: b, centred } of out) {
    const previous = result.at(-1);
    if (!centred) result.push(b);
    else if (previous?.type === 'tag' && previous.tag === 'center') previous.children.push(b);
    else result.push(tag('center', {}, [b], false));
  }
  return result;
}

const EMPHASIS = new Set(['strong', 'em', 's']);

/**
 * Markdoc can't parse emphasis around a tag (`**{% highlight %}x{% /highlight %}**`), but the
 * other way round works, so inline tags are moved outside strong/em/s:
 * strong(a, tag(b), c) -> strong(a), tag(strong(b)), strong(c).
 */
function liftTags(n: MdNode): MdNode[] {
  const children = n.children.flatMap(liftTags);
  if (!EMPHASIS.has(n.type) || !children.some((c) => c.type === 'tag' && c.inline)) {
    n.children = children;
    return [n];
  }
  const out: MdNode[] = [];
  let run: MdNode[] = [];
  const flush = () => {
    if (run.length > 0) out.push(node(n.type, n.attributes, run));
    run = [];
  };
  for (const child of children) {
    if (child.type === 'tag' && child.inline) {
      flush();
      const wrapped = node(n.type, n.attributes, child.children);
      child.children = child.children.length > 0 ? liftTags(wrapped) : [];
      out.push(child);
    } else run.push(child);
  }
  flush();
  return out;
}

const isText = (n: MdNode | undefined): n is MdNode => n?.type === 'text';
const textOf = (n: MdNode): string => String(n.attributes['content']);

/**
 * Emphasis must start and end with visible text in Markdoc (`** x**` or `**x\**` don't parse):
 * leading/trailing spaces and line breaks move outside, and empty emphasis is removed.
 */
function tidyEmphasis(children: MdNode[]): MdNode[] {
  const out: MdNode[] = [];
  for (const child of children) {
    child.children = tidyEmphasis(child.children);
    if (!EMPHASIS.has(child.type)) {
      out.push(child);
      continue;
    }
    const before: MdNode[] = [];
    const after: MdNode[] = [];
    const kids = child.children;
    for (;;) {
      const first = kids[0];
      if (first?.type === 'hardbreak') {
        kids.shift();
        before.push(first);
      } else if (isText(first) && /^\s/.test(textOf(first))) {
        const lead = /^\s+/.exec(textOf(first))?.[0] ?? '';
        before.push(node('text', { content: lead }));
        first.attributes['content'] = textOf(first).slice(lead.length);
        if (textOf(first) === '') kids.shift();
      } else break;
    }
    for (;;) {
      const last = kids.at(-1);
      if (last?.type === 'hardbreak') {
        kids.pop();
        after.unshift(last);
      } else if (isText(last) && /\s$/.test(textOf(last))) {
        const trail = /\s+$/.exec(textOf(last))?.[0] ?? '';
        after.unshift(node('text', { content: trail }));
        last.attributes['content'] = textOf(last).slice(0, -trail.length);
        if (textOf(last) === '') kids.pop();
      } else break;
    }
    out.push(...before, ...(kids.length > 0 ? [child] : []), ...after);
  }
  return out;
}

/** Text at the start of a line must not read as a list item ("1. ", "- "). */
function escapeLineStarts(children: MdNode[]): void {
  children.forEach((child, i) => {
    const previous = children[i - 1];
    if (isText(child) && (i === 0 || previous?.type === 'hardbreak')) {
      child.attributes['content'] = textOf(child)
        .replace(/^(\s*\d+)([.)])(\s)/, '$1\\$2$3')
        .replace(/^(\s*)([-+])(\s)/, '$1\\$2$3');
    }
  });
}

function tidy(n: MdNode): void {
  if (n.type === 'inline') {
    n.children = tidyEmphasis(n.children);
    escapeLineStarts(n.children);
  }
  for (const child of n.children) tidy(child);
}

export function wpToMarkdoc(html: string, options: ConvertOptions): string {
  const { document } = parseHTML(`<!doctype html><html><body>${preprocess(html)}</body></html>`);
  const ast = node('document', {}, blocks([...document.body.childNodes], options));
  ast.children = ast.children.flatMap(liftTags);
  tidy(ast);
  return Markdoc.format(ast);
}

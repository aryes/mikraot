/**
 * Checks a WordPress -> Markdoc conversion by rendering the Markdoc back to HTML and comparing it
 * with the source: the text (ignoring whitespace) and counts of every meaningful element.
 */
// Markdoc is CommonJS: under Node only its default export exists, so members are used through it.
// oxlint-disable import/no-named-as-default-member
import Markdoc from '@markdoc/markdoc';
import { parseHTML } from 'linkedom';
import { colourMark, preprocess } from './wp-to-markdoc.ts';

type Doc = ReturnType<typeof parseHTML>['document'];
type El = NonNullable<ReturnType<Doc['querySelector']>>;

const MARKS = ['highlight', 'muted', 'silent'] as const;

/** Renders every custom tag as an element with a data-tag attribute, so it can be counted. */
function renderMarkdoc(source: string): El {
  const tagNames = [
    'highlight',
    'muted',
    'silent',
    'kbd',
    'audio',
    'collapse',
    'collapse-block',
    'youtube',
    'latest-posts',
  ];
  const tags = Object.fromEntries(
    tagNames.map((name) => [
      name,
      {
        render: name === 'collapse-block' ? 'div' : 'span',
        attributes: {
          'data-tag': { type: String, default: name },
          src: { type: String },
          videoId: { type: String },
          expandText: { type: String },
          collapseText: { type: String },
        },
      },
    ]),
  );
  const config = {
    tags,
    nodes: {
      heading: {
        ...Markdoc.nodes.heading,
        attributes: { level: { type: Number }, anchor: { type: String } },
      },
    },
  };
  const ast = Markdoc.parse(source);
  const errors = Markdoc.validate(ast, config).filter((e) => e.error.level !== 'debug');
  if (errors.length > 0) throw new Error(errors.map((e) => e.error.message).join('; '));
  const html = Markdoc.renderers.html(Markdoc.transform(ast, config));
  return parseHTML(`<html><body>${html}</body></html>`).document.body;
}

function counts(root: El, side: 'source' | 'markdoc'): Record<string, number> {
  const n = (selector: string) => root.querySelectorAll(selector).length;
  const marks = { highlight: 0, muted: 0, silent: 0 };
  if (side === 'source') {
    for (const el of root.querySelectorAll('span, mark')) {
      const mark = colourMark(el);
      if (mark) marks[mark]++;
    }
  } else {
    for (const mark of MARKS) marks[mark] = n(`[data-tag="${mark}"]`);
  }
  const tagged = (placeholder: string, tag: string) =>
    n(side === 'source' ? placeholder : `[data-tag="${tag}"]`);
  return {
    links: n('a'),
    headings: n('h1, h2, h3, h4, h5, h6'),
    listItems: n('li'),
    tables: n('table'),
    rows: n('tr'),
    audio: tagged('x-audio', 'audio'),
    collapses: n(
      side === 'source'
        ? 'x-collapse, x-collapse-block'
        : '[data-tag="collapse"], [data-tag="collapse-block"]',
    ),
    collapseBlocks: tagged('x-collapse-block', 'collapse-block'),
    youtube: tagged('x-youtube', 'youtube'),
    ...marks,
  };
}

const plain = (s: string) => s.replace(/\s/g, '');

/** Differences between the source HTML and the converted Markdoc; empty when they match. */
export function verifyConversion(html: string, markdoc: string): string[] {
  const source = parseHTML(`<html><body>${preprocess(html)}</body></html>`).document.body;
  const converted = renderMarkdoc(markdoc);
  const a = counts(source, 'source');
  const b = counts(converted, 'markdoc');
  const diffs = Object.entries(a)
    .filter(([k, v]) => b[k] !== v)
    .map(([k, v]) => `${k}: ${v} -> ${b[k]}`);

  const x = plain(source.textContent ?? '');
  const y = plain(converted.textContent ?? '');
  if (x !== y) {
    let i = 0;
    while (i < x.length && x[i] === y[i]) i++;
    diffs.push(`text differs at ${i}: "${x.slice(i, i + 40)}" vs "${y.slice(i, i + 40)}"`);
  }
  return diffs;
}

// @ts-check
/**
 * Section titles in page content: each gets an id made of its words, and a small link beside it
 * that copies its address (src/scripts/content.ts copies; Arye, 2026-11-02).
 */
import { Markdoc } from '@astrojs/markdoc/config';

/** A heading's words: its text, and the trope a `trope` tag names. */
const headingWords = (/** @type {import('@markdoc/markdoc').Node} */ node) =>
  [...node.walk()]
    .map((part) => {
      if (part.type === 'text') return part.attributes.content;
      return part.type === 'tag' && part.tag === 'trope' ? part.attributes.name : '';
    })
    .join('');

/** The words joined by dashes, without vowels, cantillation marks or punctuation. */
export const headingId = (/** @type {import('@markdoc/markdoc').Node} */ node) =>
  headingWords(node)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');

const svg = (/** @type {string} */ className, /** @type {string[]} */ paths) =>
  new Markdoc.Tag(
    'svg',
    {
      class: className,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    },
    paths.map((d) => new Markdoc.Tag('path', { d })),
  );

/** The link beside a title; the icons are Lucide's "link" and "check". */
export const headingLink = (/** @type {string} */ id) =>
  new Markdoc.Tag(
    'a',
    { href: `#${id}`, class: 'heading-link', 'aria-label': 'העתקת קישור לכותרת' },
    [
      svg('heading-link-icon', [
        'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
        'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
      ]),
      svg('heading-copied-icon', ['M20 6 9 17l-5-5']),
    ],
  );

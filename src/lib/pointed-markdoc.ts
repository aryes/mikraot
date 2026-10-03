/**
 * Marks pointed text in rendered Markdoc blocks: `<span class="pointed">` around pointed runs
 * (see ./pointed.ts), so they can use the biblical-text font.
 */
// Markdoc is CommonJS: under Node only its default export exists, so members are used through it.
// oxlint-disable import/no-named-as-default-member
import Markdoc, { type Tag } from '@markdoc/markdoc';
import { pointedRanges, splitPointed } from './pointed';

/** Elements that are blocks of their own: they mark their own text. */
const BLOCKS = new Set([
  'p',
  'li',
  'ul',
  'ol',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'blockquote',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);

interface Leaf {
  parent: Tag;
  index: number;
  text: string;
}

/**
 * Wraps the pointed text of a block (not of nested blocks). The block's text is judged as a
 * whole, so a word whose letters sit in different elements (a coloured letter) stays together.
 */
export function markPointed(block: Tag): Tag {
  const leaves: Leaf[] = [];
  const walk = (tag: Tag) => {
    tag.children.forEach((child, index) => {
      if (typeof child === 'string') leaves.push({ parent: tag, index, text: child });
      else if (Markdoc.Tag.isTag(child) && !BLOCKS.has(child.name)) walk(child);
    });
  };
  walk(block);

  const ranges = pointedRanges(leaves.map((leaf) => leaf.text).join(''));
  let offset = 0;
  const parts = leaves.map((leaf) => {
    const split = splitPointed(leaf.text, ranges, offset);
    offset += leaf.text.length;
    return split;
  });
  // Replace from the last leaf back, so earlier indices in the same parent stay valid.
  for (let i = leaves.length - 1; i >= 0; i--) {
    const leaf = leaves[i];
    const split = parts[i];
    if (!leaf || !split?.some((part) => part.pointed)) continue;
    leaf.parent.children.splice(
      leaf.index,
      1,
      ...split.map((part) =>
        part.pointed ? new Markdoc.Tag('span', { class: 'pointed' }, [part.text]) : part.text,
      ),
    );
  }
  return block;
}

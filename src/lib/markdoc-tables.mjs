// @ts-check
/**
 * How the content's tables render (markdoc.config.mjs): the letter tables' cells (a letter and its
 * recording as one button, letters drawn large) and grouped headings.
 */
import { Markdoc, nodes } from '@astrojs/markdoc/config';

/**
 * One Hebrew or Arabic letter with its marks ("בּ", "غ"), maybe followed by a sof pasuk or a pasek
 * ("אֽ׃", "א֣׀": tropes shown on א in the trope list), two letters that both carry a cantillation
 * mark ("א֙א֙", two pashtas; not a pointed two-letter word), or the one or two Latin letters that
 * write a sound ("b", "sh"; large too for uniformity, Arye 2026-10-15).
 */
const LETTER =
  /^(?:[\p{Script=Hebrew}\p{Script=Arabic}]\p{M}*[׀׃]?|(?:\p{Script=Hebrew}\p{M}*[֑-֯]\p{M}*){2}|\p{Script=Latin}{1,2})$/u;

/**
 * The text of a rendered node (a heading cell's words, bold or not).
 * @param {import('@markdoc/markdoc').RenderableTreeNode} node
 * @returns {string}
 */
function textOf(node) {
  if (typeof node === 'string') return node;
  return Markdoc.Tag.isTag(node) ? node.children.map((child) => textOf(child)).join('') : '';
}

/**
 * Adjacent heading cells that begin with the same word ("מקבילות אנגלית", "מקבילות ערבית") are
 * grouped under it: a first heading row with the shared word over both, a second with the rest
 * ("אנגלית", "ערבית"); the other headings span both rows. A heading with attributes of its own
 * (a colspan) leaves the row as written. The headings are shorter, so a wide
 * table needs less room on a phone (Arye, 2026-10-15). Other tables' headings are as written.
 * @param {import('@markdoc/markdoc').Tag} thead
 */
export const groupHeadings = (thead) => {
  const [row] = thead.children;
  if (thead.children.length !== 1 || !Markdoc.Tag.isTag(row)) return thead;
  const cells = row.children.filter((cell) => Markdoc.Tag.isTag(cell));
  if (cells.some((cell) => Object.keys(cell.attributes).length > 0)) return thead;
  const words = cells.map((cell) => textOf(cell).trim().split(/\s+/));
  /** @type {{ first: string; members: number[] }[]} */
  const groups = [];
  words.forEach((cellWords, index) => {
    const previous = groups.at(-1);
    const [first = ''] = cellWords;
    if (
      previous &&
      cellWords.length > 1 &&
      previous.first === first &&
      previous.members.at(-1) === index - 1
    ) {
      previous.members.push(index);
    } else {
      groups.push({ first: cellWords.length > 1 ? first : '', members: [index] });
    }
  });
  if (groups.every((group) => group.members.length === 1)) return thead;
  const top = [];
  const bottom = [];
  for (const { first, members } of groups) {
    const [only] = members;
    const cell = only === undefined ? undefined : cells[only];
    if (members.length === 1 && Markdoc.Tag.isTag(cell)) {
      top.push(
        new Markdoc.Tag('th', { ...cell.attributes, rowspan: 2, scope: 'col' }, cell.children),
      );
      continue;
    }
    top.push(new Markdoc.Tag('th', { colspan: members.length, scope: 'col' }, [first]));
    for (const index of members) {
      const rest = (words[index] ?? []).slice(1).join(' ');
      bottom.push(new Markdoc.Tag('th', { scope: 'col' }, [rest]));
    }
  }
  thead.children = [new Markdoc.Tag('tr', {}, top), new Markdoc.Tag('tr', {}, bottom)];
  return thead;
};

/** One or two English letters, then a Hebrew example of their sound ("th כמו במילה the"). */
const EXAMPLE = /^(\p{Script=Latin}{1,2})\s+(.*\p{Script=Hebrew}.*)$/u;

/**
 * The example's English words in their own spans: Taamey David's lowercase Latin is three
 * quarters the height of its Hebrew letters, so "the" looked smaller than "כמו במילה" (Arye,
 * 2026-10-15); the CSS draws them larger.
 */
const withLatinMarked = (/** @type {string} */ text) =>
  text
    .split(/(\p{Script=Latin}+)/u)
    .filter((part) => part !== '')
    .map((part) =>
      /\p{Script=Latin}/u.test(part) ? new Markdoc.Tag('span', { class: 'latin' }, [part]) : part,
    );

/** A cell holding a letter, or letters separated by "/" or a space ("ס / שׂ", "א֨ א֜"): shown large. */
const isLetters = (/** @type {string} */ text) =>
  text.trim() !== '' &&
  text
    .trim()
    .split(/\s*\/\s*|\s+/)
    .every((part) => LETTER.test(part));

/**
 * Table cells of the letter tables: a letter (or a sound's name, "A") with its recording ("בּ" +
 * audio) becomes one button with the letter in it (AudioButton's tile); a cell of letters alone
 * gets the class `cell-letter`.
 */
export const td = {
  ...nodes.td,
  transform(
    /** @type {import('@markdoc/markdoc').Node} */ node,
    /** @type {import('@markdoc/markdoc').Config} */ config,
  ) {
    const [first] = node.children;
    const parts =
      node.children.length === 1 && first?.type === 'inline' ? first.children : node.children;
    const text = parts
      .filter((part) => part.type === 'text')
      .map((part) => String(part.attributes['content']))
      .join('')
      .trim();
    const audio = parts.filter((part) => part.type === 'tag' && part.tag === 'audio');
    const others = parts.filter((part) => part.type !== 'text' && !audio.includes(part));
    const attributes = node.transformAttributes(config);
    if (others.length === 0 && audio.length === 1 && audio[0] && text) {
      const tile = new Markdoc.Ast.Node(
        'tag',
        { ...audio[0].attributes, label: text },
        [],
        'audio',
      );
      return new Markdoc.Tag('td', attributes, [Markdoc.transform(tile, config)]);
    }
    if (others.length === 0 && audio.length === 0 && isLetters(text)) {
      return new Markdoc.Tag(
        'td',
        { ...attributes, class: 'cell-letter' },
        node.transformChildren(config),
      );
    }
    // English letters with an example ("th כמו במילה the"): the letters large like their column,
    // the example under them, a little smaller (Arye, 2026-10-15).
    const example = others.length === 0 && audio.length === 0 && EXAMPLE.exec(text);
    if (example) {
      const [, letters = '', words = ''] = example;
      return new Markdoc.Tag('td', { ...attributes, class: 'cell-letter' }, [
        letters,
        ' ', // keeps "th" and "כמו" apart for search and screen readers
        new Markdoc.Tag('span', { class: 'cell-example' }, withLatinMarked(words)),
      ]);
    }
    return new Markdoc.Tag('td', attributes, node.transformChildren(config));
  },
};

/** Table headings, grouped where they share a first word (`groupHeadings`). */
export const thead = {
  ...nodes.thead,
  transform(
    /** @type {import('@markdoc/markdoc').Node} */ node,
    /** @type {import('@markdoc/markdoc').Config} */ config,
  ) {
    return groupHeadings(
      new Markdoc.Tag('thead', node.transformAttributes(config), node.transformChildren(config)),
    );
  },
};

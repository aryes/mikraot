// @ts-check
/**
 * How page content (src/content/pages/*.mdoc) renders. The tags are the ones the WordPress import
 * produces (scripts/content/wp-to-markdoc.ts) and the Keystatic editor offers (keystatic.config.tsx).
 */
import { Markdoc, component, defineMarkdocConfig, nodes } from '@astrojs/markdoc/config';

/** A tag rendered as a plain element with a fixed class. */
const styled = (/** @type {string} */ element, /** @type {string} */ className) => ({
  render: element,
  attributes: { class: { type: String, default: className } },
});

const collapse = (/** @type {boolean} */ inline) => ({
  render: component('./src/components/content/Collapse.astro'),
  attributes: {
    expandText: { type: String },
    collapseText: { type: String },
    inline: { type: Boolean, default: inline },
  },
});

/**
 * One Hebrew or Arabic letter with its marks ("בּ", "غ"), or the one or two Latin letters that
 * write a sound ("b", "sh"; large too for uniformity, Arye 2026-10-15).
 */
const LETTER = /^(?:[\p{Script=Hebrew}\p{Script=Arabic}]\p{M}*|\p{Script=Latin}{1,2})$/u;

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

/** A cell holding a letter, or letters separated by "/" ("ס / שׂ"): shown large. */
const isLetters = (/** @type {string} */ text) =>
  text !== '' && text.split('/').every((part) => LETTER.test(part.trim()));

/**
 * Table cells of the letter tables: a letter (or a sound's name, "A") with its recording ("בּ" +
 * audio) becomes one button with the letter in it (AudioButton's tile); a cell of letters alone
 * gets the class `cell-letter`.
 */
const td = {
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
    // the example under them at text size (Arye, 2026-10-15).
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

export default defineMarkdocConfig({
  nodes: {
    heading: {
      ...nodes.heading,
      attributes: {
        level: { type: Number, required: true },
        anchor: { type: String },
        // The level is the page's outline (screen readers navigate by it); size="small" draws a
        // heading smaller than its level, so the outline can be right without changing the look.
        size: { type: String, matches: ['', 'small'] },
      },
      // An explicit anchor (the target of in-page links) becomes the heading's id.
      transform(node, config) {
        const { level, anchor, size } = node.transformAttributes(config);
        return new Markdoc.Tag(
          `h${level}`,
          { ...(anchor && { id: anchor }), ...(size === 'small' && { class: 'heading-small' }) },
          node.transformChildren(config),
        );
      },
    },
    link: { ...nodes.link, render: component('./src/components/content/ContentLink.astro') },
    table: { ...nodes.table, render: component('./src/components/content/ContentTable.astro') },
    td,
  },
  tags: {
    // Colour marks: the taught letter/vowel, de-emphasised context, silent letters.
    highlight: styled('span', 'mark-highlight'),
    muted: styled('span', 'mark-muted'),
    silent: styled('span', 'mark-silent'),
    kbd: styled('kbd', 'content-kbd'),
    audio: {
      render: component('./src/components/content/AudioButton.astro'),
      // label: set by `td` above, not written in content.
      attributes: { src: { type: String, required: true }, label: { type: String } },
      selfClosing: true,
    },
    // A hidden explanation within a sentence, or (collapse-block) whole hidden paragraphs.
    collapse: collapse(true),
    'collapse-block': collapse(false),
    youtube: {
      render: component('./src/components/content/YouTube.astro'),
      attributes: { videoId: { type: String, required: true } },
      selfClosing: true,
    },
    // A nested list of links shown as rows of choices (book, then parasha, then reading).
    picker: {
      render: component('./src/components/content/ListPicker.astro'),
      attributes: { levels: { type: String }, chapters: { type: String } },
    },
    'latest-posts': {
      render: component('./src/components/content/LatestPosts.astro'),
      selfClosing: true,
    },
  },
});

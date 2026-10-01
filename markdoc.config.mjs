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

export default defineMarkdocConfig({
  nodes: {
    heading: {
      ...nodes.heading,
      attributes: { level: { type: Number, required: true }, anchor: { type: String } },
      // An explicit anchor (the target of in-page links) becomes the heading's id.
      transform(node, config) {
        const { level, anchor } = node.transformAttributes(config);
        return new Markdoc.Tag(
          `h${level}`,
          anchor ? { id: anchor } : {},
          node.transformChildren(config),
        );
      },
    },
    link: { ...nodes.link, render: component('./src/components/content/ContentLink.astro') },
  },
  tags: {
    // Colour marks: the taught letter/vowel, de-emphasised context, silent letters.
    highlight: styled('span', 'mark-highlight'),
    muted: styled('span', 'mark-muted'),
    silent: styled('span', 'mark-silent'),
    kbd: styled('kbd', 'content-kbd'),
    audio: {
      render: component('./src/components/content/AudioButton.astro'),
      attributes: { src: { type: String, required: true } },
      selfClosing: true,
    },
    collapse: {
      render: component('./src/components/content/Collapse.astro'),
      attributes: { expandText: { type: String }, collapseText: { type: String } },
      // The same tag wraps a few words or whole paragraphs; the component needs to know which.
      transform(node, config) {
        return new Markdoc.Tag(
          // @ts-expect-error `this` is the schema, whose render is the component config
          this.render,
          { ...node.transformAttributes(config), inline: node.inline },
          node.transformChildren(config),
        );
      },
    },
    youtube: {
      render: component('./src/components/content/YouTube.astro'),
      attributes: { videoId: { type: String, required: true } },
      selfClosing: true,
    },
    'latest-posts': {
      render: component('./src/components/content/LatestPosts.astro'),
      selfClosing: true,
    },
  },
});

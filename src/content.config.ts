import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Pages and posts, one Markdoc file each (imported from WordPress, edited with Keystatic). */
const pages = defineCollection({
  loader: glob({
    pattern: '**/*.mdoc',
    base: './src/content/pages',
    // The file name is the slug, exactly: the default slugifier would alter Hebrew with niqqud.
    generateId: ({ entry }) => entry.replace(/\.mdoc$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    /** WordPress post ID: kept so old comments and links can be matched. */
    wpId: z.number().int().nullish(),
    kind: z.enum(['page', 'post']).default('page'),
    /** Slug of the parent page; the URL nests under it, like WordPress. */
    parent: z.string().nullish(),
    order: z.number().int().default(0),
    date: z.coerce.date(),
    /** Posts only: category slugs (src/data/site.json lists the categories). */
    categories: z.array(z.string()).default([]),
    // Keystatic writes empty fields as '' or null; both mean "not set".
    excerpt: z.string().nullish(),
    draft: z.boolean().default(false),
    seo: z
      .object({
        title: z.string(),
        description: z.string().nullish(),
        ogImage: z.string().nullish(),
      })
      .nullish(),
  }),
});

export const collections = { pages };

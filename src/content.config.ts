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
    wpId: z.number().int().optional(),
    kind: z.enum(['page', 'post']).default('page'),
    /** Slug of the parent page; the URL nests under it, like WordPress. */
    parent: z.string().optional(),
    order: z.number().int().default(0),
    date: z.coerce.date(),
    excerpt: z.string().optional(),
    draft: z.boolean().default(false),
    seo: z
      .object({
        title: z.string(),
        description: z.string().optional(),
        ogImage: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = { pages };

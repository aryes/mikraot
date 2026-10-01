import { createReader } from '@keystatic/core/reader';
import { describe, expect, it } from 'vitest';
import keystaticConfig from '../keystatic.config';

/** Every content file must open in the editor: read through Keystatic's own schema. */
describe('Keystatic can read all content', () => {
  const reader = createReader(process.cwd(), keystaticConfig);

  it('reads every page with its Markdoc body', async () => {
    const slugs = await reader.collections.pages.list();
    expect(slugs.length).toBeGreaterThan(30);
    const entries = await Promise.all(
      slugs.map(async (slug) => {
        const entry = await reader.collections.pages.readOrThrow(slug);
        return { slug, draft: entry.draft, node: (await entry.content()).node };
      }),
    );
    for (const { slug, draft, node } of entries) {
      // Published pages have content; some WordPress drafts were empty.
      if (!draft) expect(node.children.length, slug).toBeGreaterThan(0);
    }
  });

  it('reads the site settings', async () => {
    const site = await reader.singletons.site.readOrThrow();
    expect(site.frontPage).toBe('מקראות');
  });
});

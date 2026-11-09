import type { APIRoute } from 'astro';
import { commentKeys, getSitePages } from '../lib/site';
import type { PageIndex } from '../server/page-index';

/**
 * Every key a page is known by (path, WordPress slug and ID: the keys its comments may be stored
 * under) with its title and URL; see src/server/page-index.ts.
 */
export const GET: APIRoute = async () => {
  const index: PageIndex = {};
  for (const page of await getSitePages()) {
    const { title, comments } = page.entry.data;
    // A page without comments stays in the index (old ?p= links) but refuses new ones.
    for (const key of commentKeys(page))
      index[key] = comments ? { title, url: page.url } : { title, url: page.url, noComments: true };
  }
  return Response.json(index);
};

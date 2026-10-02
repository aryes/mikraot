/**
 * WordPress short links by ID (/?p=1, /?page_id=48) go to the page they name, looked up in the
 * page index (src/pages/page-index.json.ts). Search links (/?s=) are handled by search.ts.
 */
import { findPage, type PageIndex } from '../server/page-index';

const params = new URLSearchParams(location.search);
const id = params.get('p') ?? params.get('page_id');
if (id && /^\d+$/.test(id)) {
  fetch('/page-index.json')
    .then(async (res): Promise<PageIndex> => (res.ok ? res.json() : {}))
    .then((index) => {
      const page = findPage(index, id);
      if (page) location.replace(page.url);
    })
    .catch((error: unknown) => console.error('Old link lookup failed:', error));
}

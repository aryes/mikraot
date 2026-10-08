/**
 * Searches that found nothing: a list of content visitors look for and don't find. Written to
 * Workers Analytics Engine (dataset `mikraot_search_misses`), Cloudflare's store for this kind of
 * counting: its own free quota (so a flood can't use up the database's writes, which comments
 * need) and data deleted after three months. List it with `npm run search:misses`.
 */

const MAX_QUERY_LENGTH = 100;
export const MAX_REPORT_BYTES = 1024;

/** The part of the Analytics Engine binding this module uses. */
export interface SearchMissesDataset {
  writeDataPoint(point: { blobs: string[]; doubles: number[] }): void;
}

/**
 * The query to count, or null. Tidied so that one query is one row (Unicode form of the vowel
 * points, spacing, Latin letter case). Queries that look like personal data (an email address, a
 * phone or ID number) are not kept: people sometimes type those into any box.
 */
export function parseSearchMiss(body: unknown): string | null {
  const value = body && typeof body === 'object' ? Reflect.get(body, 'query') : undefined;
  if (typeof value !== 'string') return null;
  const query = value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!query || query.length > MAX_QUERY_LENGTH) return null;
  // Seven or more digits, however separated: phone, ID and card numbers.
  if (query.includes('@') || /(?:\d[\s().+-]*){7}/.test(query)) return null;
  return query;
}

export function recordSearchMiss(dataset: SearchMissesDataset, query: string): void {
  dataset.writeDataPoint({ blobs: [query], doubles: [1] });
}

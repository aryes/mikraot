import type { APIRoute } from 'astro';
import { getSitePages } from '../lib/site';

/**
 * The keys new comments may be stored under (one per page, as sent by the comments form).
 * Built as a static file; the comments API reads it to refuse comments for pages that don't exist.
 */
export const GET: APIRoute = async () =>
  Response.json((await getSitePages()).map(({ entry, path }) => path || entry.id));

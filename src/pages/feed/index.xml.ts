import type { APIRoute } from 'astro';
import { feed } from '../../lib/feeds';
import { getPosts, site } from '../../lib/site';

/** The posts feed, served at /feed/. */
export const GET: APIRoute = async (context) => feed(site.title, context.site, await getPosts());

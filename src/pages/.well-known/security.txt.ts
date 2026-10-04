import type { APIRoute } from 'astro';
import { securityTxt } from '../../lib/security-txt';

/** Prerendered to a static file; its Content-Type is set in public/_headers. */
export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('`site` must be set in astro.config.mjs');
  return new Response(securityTxt(site, new Date()));
};

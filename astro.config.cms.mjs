// @ts-check
/**
 * Local content editing: the site plus the Keystatic editor at /keystatic (npm run cms).
 * Keystatic's local mode writes the content files, so this runs on Node, not in workerd.
 */
import keystatic from '@keystatic/astro';
import node from '@astrojs/node';
import react from '@astrojs/react';
import site from './astro.config.mjs';

/** @type {import('astro').AstroUserConfig} */
const config = {
  ...site,
  // Keystatic's API calls have no trailing slash; the site's own URLs are unaffected.
  trailingSlash: 'ignore',
  adapter: node({ mode: 'standalone' }),
  // Keystatic's editor is a React app: React here instead of the site's Preact.
  integrations: [
    react(),
    ...(site.integrations ?? []).filter(
      (integration) =>
        !(integration && 'name' in integration && integration.name === '@astrojs/preact'),
    ),
    keystatic(),
  ],
};

export default config;

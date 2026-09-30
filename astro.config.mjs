// @ts-check
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://mikraot.net',
  // WordPress URLs end with a slash; keep them identical.
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Optimize images at build time (no Cloudflare Images binding); the site uses no sessions.
  adapter: cloudflare({ imageService: 'compile' }),
  session: false,
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});

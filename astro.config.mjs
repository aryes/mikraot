// @ts-check
import cloudflare from '@astrojs/cloudflare';
import markdoc from '@astrojs/markdoc';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  site: 'https://mikraot.net',
  // WordPress URLs end with a slash; keep them identical.
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Optimize images at build time (no Cloudflare Images binding); the site uses no sessions.
  adapter: cloudflare({ imageService: 'compile' }),
  session: false,
  // Content-Security-Policy as a <meta> on every page: Astro adds hashes for its own inline scripts
  // and styles. frame-ancestors can't be set this way; it is in public/_headers.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "media-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        // YouTube players (embedded videos and the video popup); the Turnstile widget.
        'frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      // Pagefind's search index runs as WebAssembly; Turnstile's script guards the comment form.
      scriptDirective: {
        resources: ["'self'", "'wasm-unsafe-eval'", 'https://challenges.cloudflare.com'],
      },
    },
  },
  env: {
    schema: {
      // Turnstile site key (public; widget "mikraot.net comments", works only on mikraot.net).
      // Tests override it with Cloudflare's test key (playwright.config.ts); the secret is a Worker secret.
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        default: '0x4AAAAAAFL0OyR8bp2yP3s0',
      }),
    },
  },
  integrations: [react(), markdoc(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});

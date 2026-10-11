// @ts-check
import cloudflare from '@astrojs/cloudflare';
import markdoc from '@astrojs/markdoc';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField } from 'astro/config';

/** Cloudflare's always-pass Turnstile test site key. */
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
const ciBranch = process.env['WORKERS_CI_BRANCH'];
const isPreviewBuild = ciBranch !== undefined && ciBranch !== 'main';
// `astro dev` keeps its local Cloudflare data (the D1 database…) and its Vite cache apart, so a
// dev server can stay open while builds, previews and tests run (`npm run dev` sets up its
// database with the fictional fixtures).
// Read from the command line: the adapter takes its options before Astro's hooks (which know the
// command) run. Keystatic's dev server (`--config astro.config.cms.mjs`) keeps the defaults.
const isDevServer = process.argv[2] === 'dev' && !process.argv.includes('--config');

export default defineConfig({
  site: 'https://mikraot.net',
  // WordPress URLs end with a slash; keep them identical.
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Optimize images at build time (no Cloudflare Images binding); the site uses no sessions.
  adapter: cloudflare({
    imageService: 'compile',
    // Static pages are built in Node: the share pictures (src/pages/og/) are drawn with Node APIs
    // (files, WebAssembly fonts). The on-demand API routes still run in workerd.
    prerenderEnvironment: 'node',
    ...(isDevServer && { persistState: { path: '.wrangler/state-dev' } }),
  }),
  // Video pictures are downloaded from YouTube at build time and served by the site
  // (src/components/content/YouTube.astro).
  image: { domains: ['i.ytimg.com'] },
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
      // Builds of branches other than main (Cloudflare Workers Builds sets WORKERS_CI_BRANCH) are
      // previews on workers.dev, so they get Cloudflare's test key, matching the previews' test
      // secret (wrangler.jsonc). Tests override it too (playwright.config.ts).
      PUBLIC_TURNSTILE_SITE_KEY: envField.string({
        context: 'client',
        access: 'public',
        default: isPreviewBuild ? TURNSTILE_TEST_SITE_KEY : '0x4AAAAAAFL0OyR8bp2yP3s0',
      }),
    },
  },
  integrations: [
    // The comment form is written against React's API but runs on Preact (compat): the same
    // components for about 10 KB instead of React's 60 KB, which on short posts (comments in view
    // at once) cost ~12 Lighthouse points. The Keystatic editor needs real React:
    // astro.config.cms.mjs swaps it back. Type checks use React's types (tsconfig), so avoid
    // React-19-only APIs that Preact lacks (CLAUDE.md).
    preact({ compat: true }),
    markdoc(),
    // The author archive is noindex, as on the live site.
    // Not the author archive (noindex) or the unsubscribe page (for email links only).
    sitemap({ filter: (page) => !page.includes('/author/') && !page.includes('/unsubscribe/') }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // Likewise its own Vite cache: a build replaced files in node_modules/.vite that a running dev
    // server still needed (seen 2026-10-08).
    ...(isDevServer && { cacheDir: 'node_modules/.vite-dev' }),
    // Vite inlines small files as data: URLs; fonts must stay files, since the CSP allows only
    // font-src 'self' (Noto's tiny Cyrillic/Greek subsets were being inlined).
    build: { assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined) },
    // The icons are React components. Bundled into the server render (here and in the prerender
    // step) so that Preact's React alias applies; loaded from node_modules they'd use real React.
    resolve: { noExternal: ['lucide-react'] },
  },
});

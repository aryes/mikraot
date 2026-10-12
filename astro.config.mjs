// @ts-check
import cloudflare from '@astrojs/cloudflare';
import markdoc from '@astrojs/markdoc';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField, fontProviders } from 'astro/config';

/**
 * The self-hosted Noto variable fonts (Fontsource packages), as Astro font variants: the Hebrew,
 * Latin and Latin Extended subsets, each with its unicode range, so browsers fetch only the
 * subsets a page uses (as Fontsource's own CSS did). The ranges are Fontsource's. The Hebrew subset
 * is our copy with bold vowel and cantillation marks (scripts/fonts/bold-marks.py).
 */
const notoSubsets = (/** @type {string} */ name) => {
  const variant = (/** @type {string} */ subset, /** @type {string} */ range) => ({
    src: /** @type {[string]} */ ([
      subset === 'hebrew'
        ? `./src/assets/fonts/noto-bold-marks/${name}-hebrew-wght-normal.woff2`
        : `@fontsource-variable/${name}/files/${name}-${subset}-wght-normal.woff2`,
    ]),
    weight: /** @type {const} */ ('100 900'),
    style: /** @type {const} */ ('normal'),
    unicodeRange: /** @type {[string]} */ ([range]),
  });
  return /** @type {[ReturnType<typeof variant>, ...ReturnType<typeof variant>[]]} */ ([
    variant('hebrew', 'U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F'),
    variant(
      'latin',
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
    ),
    variant(
      'latin-ext',
      'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
    ),
  ]);
};

/** Cloudflare's always-pass Turnstile test site key. */
const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
const ciBranch = process.env['WORKERS_CI_BRANCH'];
const isPreviewBuild = ciBranch !== undefined && ciBranch !== 'main';
/** Sentry project "javascript-astro" (EU; public: it only lets a client send error reports). */
const SENTRY_DSN =
  'https://14039a75d2faec81966a64d944a17ef9@o4512244833386496.ingest.de.sentry.io/4512244858945616';
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
        // Umami (visitor statistics) sends its counts here; Sentry receives error reports.
        "connect-src 'self' https://gateway.umami.is https://o4512244833386496.ingest.de.sentry.io",
        // YouTube players (embedded videos and the video popup); the Turnstile widget.
        'frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com',
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      // Pagefind's search index runs as WebAssembly; Turnstile's script guards the comment form;
      // Umami's script counts visits.
      scriptDirective: {
        resources: [
          "'self'",
          "'wasm-unsafe-eval'",
          'https://challenges.cloudflare.com',
          'https://cloud.umami.is',
        ],
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
      // Where errors are reported (src/lib/sentry.ts). Only Workers Builds of main (the
      // deployed site) get it: local runs, tests and previews report nothing, so their errors
      // (some deliberate) don't fill the free plan's monthly quota.
      PUBLIC_SENTRY_DSN: envField.string({
        context: 'client',
        access: 'public',
        default: ciBranch === 'main' ? SENTRY_DSN : '',
      }),
    },
  },
  // Fonts through Astro's font support: it writes the @font-face rules, preloads the main font and
  // gives each family a fallback sized to its metrics (Lighthouse measured a layout shift of 0.1
  // on the home page from the swap). The package files, not fontProviders.fontsource(): the same
  // fonts, but Fontsource's online copies were up to 70% larger (measured 2026-10-11).
  fonts: [
    {
      // All text, headings included, with or without marks: one font for all Hebrew, so pointed
      // and plain words look alike side by side (Arye, 2026-10-11); headings differ by size and
      // weight only. Noto covers every niqqud and cantillation mark.
      provider: fontProviders.local(),
      name: 'Noto Sans Hebrew',
      cssVariable: '--font-noto-sans',
      fallbacks: ['sans-serif'],
      options: { variants: notoSubsets('noto-sans-hebrew') },
    },
    {
      // The site name in the logo (header and footer), as designed. src/assets/fonts/taamey-d/
      provider: fontProviders.local(),
      name: 'Taamey D',
      cssVariable: '--font-taamey',
      fallbacks: ['serif'],
      options: {
        variants: [
          { src: ['./src/assets/fonts/taamey-d/Taamey_D.woff2'], weight: '400', style: 'normal' },
        ],
      },
    },
  ],
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

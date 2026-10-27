// @ts-check
import cloudflare from '@astrojs/cloudflare';
import markdoc from '@astrojs/markdoc';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, envField, fontProviders } from 'astro/config';
import { NUSACH_HEAD_HASH } from './src/lib/nusach-head.mjs';

/**
 * Noto Sans Hebrew, only for the symbols Taamey David lacks (©, –, …): its Latin and Latin Extended
 * files trimmed to those characters by scripts/fonts/subsets.py, which prints these ranges. Each
 * file is fetched only by a page that uses one of its characters.
 */
const symbolsVariant = (/** @type {string} */ file, /** @type {string} */ range) => ({
  src: /** @type {[string]} */ ([`./src/assets/fonts/noto-sans-hebrew/${file}`]),
  weight: /** @type {const} */ ('100 900'),
  style: /** @type {const} */ ('normal'),
  unicodeRange: /** @type {[string]} */ ([range]),
});
const notoSymbols =
  /** @type {[ReturnType<typeof symbolsVariant>, ...ReturnType<typeof symbolsVariant>[]]} */ ([
    symbolsVariant(
      'NotoSansHebrew-latin-symbols.woff2',
      'U+000D,U+00A0-00A2,U+00A5,U+00A7-00AB,U+00AE-00B0,U+00B4,U+00B6-00B8,U+00BA-00BB,U+00BF-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+0304,U+2013-2014,U+2022,U+2026,U+2039-203A,U+2122,U+2212',
    ),
    symbolsVariant(
      'NotoSansHebrew-latin-ext-symbols.woff2',
      'U+0100-0107,U+010A-0113,U+0116-011B,U+011E-0123,U+0126-0127,U+012A-012B,U+012E-0130,U+0136-0137,U+0139-013E,U+0141-0148,U+0150-0151,U+0154-0155,U+0158-015B,U+015E-0161,U+0164-0165,U+016A-016B,U+016E-017E,U+0218-021B,U+0237,U+02C7,U+02C9,U+02DD,U+0304,U+1E80-1E85,U+1E9E,U+1EF2-1EF3',
    ),
  ]);

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
  // and styles. frame-ancestors can't be set this way; it is in public/_headers and, for pages the
  // Worker answers (whose policy Astro sends as a header), src/server/security-headers.ts.
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
        // The inline script applying the reader's tradition (src/lib/nusach-head.mjs).
        hashes: [NUSACH_HEAD_HASH],
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
      // Only the few symbols Taamey David lacks (©, –, …, arrows) since 2026-10-14; not preloaded.
      provider: fontProviders.local(),
      name: 'Noto Sans Hebrew',
      cssVariable: '--font-noto-sans',
      fallbacks: ['sans-serif'],
      options: { variants: notoSymbols },
    },
    {
      // All text, headings included (2026-10-14, Arye): Taamey David CLM places cantillation marks
      // correctly where Noto doesn't. scripts/fonts/taamey-david.py rebuilds its bold (Culmus's has
      // no cantillation) and enlarges both weights to Noto's letter size.
      provider: fontProviders.local(),
      name: 'Taamey David CLM',
      cssVariable: '--font-taamey-david',
      // No stand-in font of its own: symbols it lacks must reach Noto next in --font-sans, not a
      // system serif (it's preloaded, so the page rarely draws before it arrives).
      fallbacks: [],
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/taamey-david/TaameyDavidCLM-Medium.woff2'],
            weight: '400',
            style: 'normal',
          },
          {
            src: ['./src/assets/fonts/taamey-david/TaameyDavidCLM-Bold.woff2'],
            weight: '700',
            style: 'normal',
          },
        ],
      },
    },
    {
      // The Arabic letters on the pronunciation pages: without a font of our own they fell back to
      // a small system font whose dots barely showed (Arye, 2026-10-13). Listed before Noto Sans
      // Hebrew in --font-sans (src/styles/global.css) but limited to Arabic characters, so it
      // changes nothing else; not preloaded, so only pages with Arabic text fetch it. No fallback
      // font of its own: one would claim every other character.
      provider: fontProviders.local(),
      name: 'Noto Sans Arabic',
      cssVariable: '--font-noto-arabic',
      fallbacks: [],
      options: {
        variants: [
          {
            // Trimmed to the basic Arabic block by scripts/fonts/subsets.py (162 → 66 KB).
            src: ['./src/assets/fonts/noto-sans-arabic/NotoSansArabic-arabic.woff2'],
            weight: '100 900',
            style: 'normal',
            unicodeRange: ['U+0600-06FF'],
          },
        ],
      },
    },
    {
      // The site name in the logo (header and footer), as designed. src/assets/fonts/taamey-d/
      provider: fontProviders.local(),
      name: 'Taamey D',
      cssVariable: '--font-taamey',
      fallbacks: ['serif'],
      options: {
        variants: [
          // Only the site name's letters (scripts/fonts/subsets.py; 21 → 2 KB).
          {
            src: ['./src/assets/fonts/taamey-d/Taamey_D-logo.woff2'],
            weight: '400',
            style: 'normal',
          },
        ],
      },
    },
  ],
  integrations: [
    // The comment and newsletter forms are written against React's API but runs on Preact (compat): the same
    // components for about 10 KB instead of React's 60 KB, which on short posts (comments in view
    // at once) cost ~12 Lighthouse points. The Keystatic editor needs real React:
    // astro.config.cms.mjs swaps it back. Type checks use React's types (tsconfig), so avoid
    // React-19-only APIs that Preact lacks (CLAUDE.md).
    preact({ compat: true }),
    markdoc(),
    // Not the author archive (noindex), nor the pages opened only from email links.
    sitemap({
      filter: (page) =>
        !['/author/', '/unsubscribe/', '/newsletter/', '/comments/manage/'].some((path) =>
          page.includes(path),
        ),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // Likewise its own Vite cache: a build replaced files in node_modules/.vite that a running dev
    // server still needed (seen 2026-10-08).
    ...(isDevServer && { cacheDir: 'node_modules/.vite-dev' }),
    // Vite inlines small files as data: URLs; fonts must stay files, since the CSP allows only
    // font-src 'self' (small font subsets were once inlined).
    build: { assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined) },
    // The icons are React components. Bundled into the server render (here and in the prerender
    // step) so that Preact's React alias applies; loaded from node_modules they'd use real React.
    resolve: { noExternal: ['lucide-react'] },
  },
});

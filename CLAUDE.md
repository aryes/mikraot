# Mikraot.net

The website https://mikraot.net: a Hebrew site teaching Bible reading (pronunciation, grammar, cantillation), with courses, lessons, quizzes and audio.
Stack: Astro (static pages) + React islands + TypeScript + Tailwind, one Cloudflare Worker (pages + API, D1), git → GitHub later.
The live site currently runs on WordPress (Bluehost) and is being migrated to this stack.
The plan and known issues are in `docs/ROADMAP.md`.

## Working agreement (owner: Arye)

1. Claude operates the services directly: Cloudflare (wrangler / API / dashboard), Bluehost (SSH, WP-CLI, cPanel), WordPress.
2. Claude installs/uninstalls packages and runs all commands. Arye supervises and approves; he does not run commands or write code.
3. **Never commit without Arye's explicit approval.** That includes amends and history rewrites.
4. **The original site is the reference.** All content and features of mikraot.net must exist in the new site before cutover. Verify by crawling and comparing, not by assumption.
5. **No GitHub until the repo is safe:** no secrets in files or git history, secret scanning in place.
6. Claude acts as web developer, security expert and UX advisor — raise concerns proactively.
7. Maintainable, high-quality code: strict TypeScript, lint/format, tests, current stable packages, small focused modules, no dead code.
8. Ask before anything irreversible or public-facing: DNS/cutover, deleting WordPress data or backups, deleting D1 data, billing. Always back up before destructive server/DB operations.

## Secrets policy

- Never write credentials into tracked files (including docs, CLAUDE.md, code fallbacks).
- Local: `.env` / `.dev.vars` (gitignored). Worker: `wrangler secret`. Cloudflare auth: `wrangler login` (OAuth), not pasted tokens.
- Secret scanning: gitleaks pre-commit hook in `.githooks/`, rules in `.gitleaks.toml`. `npm install` enables it (`prepare` script); gitleaks itself: `winget install Gitleaks.Gitleaks`.

## Architecture

- Content: one Markdoc file per page/post in `src/content/pages/` (frontmatter: title, wpId, parent, order, date, draft, seo), schema in `src/content.config.ts`. Menu and site settings in `src/data/menu.json` and `src/data/site.json`. Astro builds one static page per URL (`src/pages/[...path].astro`; URLs nest under parent pages like WordPress, `src/lib/urls.ts`). Content tags (colour marks highlight/muted/silent, collapse, audio, youtube, latest-posts, kbd, heading anchors) render via `markdoc.config.mjs` and `src/components/content/`; `src/scripts/content.ts` adds audio/collapse/video behaviour.
- Layout: `src/layouts/ContentLayout.astro` = photo banner with title and breadcrumb trail + content card + sidebar (archives, categories). Posts (`kind: post`, with `categories` slugs; category list and the one author in `src/data/site.json`) also get month, category and author archives (`src/pages/[year]/[month].astro`, `category/`, `author/`) and RSS feeds at the WordPress URLs (`src/lib/feeds.ts`; `/comments/feed/` is built by the Worker). `/page-index.json` maps every key a page is known by (path, WordPress slug and ID) to its title and URL: used by the comments API, the comments feed and old `?p=` links. Old URL forms are handled in `public/_redirects` and `src/scripts/legacy-links.ts`.
- `wrangler.jsonc` configures the new single Worker `mikraot` (static assets `ASSETS`, D1 `DB`, rate limit `COMMENT_RATE_LIMIT`); not deployed yet. `npm run deploy:dry` bundles it without uploading.
- Security headers: CSP via `security.csp` in `astro.config.mjs` (meta tag, hashed scripts; no inline scripts without it), other headers in `public/_headers` (static files only; the API sets its own). CI: `.github/workflows/ci.yml` (not pushed).
- Comments API: `src/pages/api/comments.ts` (on-demand route in the site Worker) using `src/server/comments.ts`; D1 schema in `migrations/`. Local dev/tests use a local D1 (`npm run db:local:reset` loads fictional fixtures).
- The old separate Worker `worker/` → `mikraot-api` on `mikraot.net/api/*` is still deployed and serves only the old staging app; remove it at cutover. Production D1 has no migration history yet: apply `migrations/` remotely (0001 is a no-op there) before the new Worker goes live.
- `npm run compare:live` (after `npm run build`) checks every page against the live site; use it after any change to content rendering.
- The content was imported from WordPress by `npm run content:import` (scripts/content/: converter + verification; inputs `.migration/wp-export.json` and `.migration/seo.json` from `npm run seo:fetch`). Re-running it overwrites `src/content/pages/`: only until edits start. SEO tags live in each page's frontmatter.
- Media (76 MP3s, 52 images) is in `public/wp-content/uploads/`, at the same paths as on WordPress; content URLs are rewritten to site-relative `/wp-content/...`. Plugin folders and user avatars from WordPress uploads were deliberately not copied.
- Live site is still WordPress. Staging app: https://mikraot.net/staging/app/

## Procedures

- Build: `npm run build` = type check + `build:site` (Astro build, then the Pagefind search index into `dist/client/pagefind/`; search only works in built output, not in `npm run dev`).
- Content editing: `npm run cms` (http://localhost:4400/keystatic): Keystatic edits `src/content/pages/` and `src/data/site.json` directly; config in `keystatic.config.tsx` must stay in sync with `markdoc.config.mjs` (`src/keystatic.test.ts` reads all content through it). Runs on Node via `astro.config.cms.mjs`.
- Before every commit: `npm run check` (type check, lint with warnings as errors, formatting, unit tests).
- Dev server: `npm run dev` (http://localhost:4321, runs in Cloudflare's workerd). Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`.
- `.dev.vars` must exist (it may be empty): it stops wrangler from loading `.env`, whose operations credentials must never reach the Worker.
- SSH to Bluehost goes directly to the origin IP (`SSH_HOST` / `SSH_USER` in `.env`), because Cloudflare doesn't proxy port 22. The old staging app at /staging/app/ is no longer updated.
- Deploy the old API Worker: `npx wrangler deploy --config wrangler.json` from `worker/` (explicit config: the Astro build leaves a `.wrangler/deploy` redirect in the root). One-time `npx wrangler login` first.
- Query D1: `npx wrangler d1 execute mikraot-db --remote --command "..."`.

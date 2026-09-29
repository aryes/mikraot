# Mikraot.net — Migration Project

Migrating https://mikraot.net (WordPress on Bluehost) to a modern stack:
React + TypeScript + Vite + Tailwind, Cloudflare (Workers, D1, static hosting), git → GitHub later.

## Working agreement (owner: Arye)
1. Claude operates the services directly: Cloudflare (wrangler / API / dashboard), Bluehost (SSH, WP-CLI, cPanel), WordPress.
2. Claude installs/uninstalls packages and runs all commands. Arye supervises and approves; he does not run commands or write code.
3. **The original site is the reference.** All content and features of mikraot.net must exist in the new site before cutover. Verify by crawling and comparing, not by assumption.
4. **No GitHub until the repo is safe:** no secrets in files or git history, secret scanning in place.
5. Claude acts as web developer, security expert and UX advisor — raise concerns proactively.
6. Maintainable, high-quality code: strict TypeScript, lint/format, tests, current stable packages, small focused modules, no dead code.
7. Ask before anything irreversible or public-facing: DNS/cutover, deleting WordPress data or backups, deleting D1 data, billing. Always back up before destructive server/DB operations.

## Secrets policy
- Never write credentials into tracked files (including docs, CLAUDE.md, code fallbacks).
- Local: `.env` / `.dev.vars` (gitignored). Worker: `wrangler secret`. Cloudflare auth: `wrangler login` (OAuth), not pasted tokens.
- `MIGRATION_DOCUMENTATION*.md` currently contain live credentials → must be scrubbed and all listed credentials rotated (Cloudflare API token, WP DB password + auth salts, Supabase keys/DB password).

## Current state (Sept 2026)
- Frontend: hash router (`#/slug`), all content bundled from `src/data/siteData.json` (~1 MB, 340 items, exported from WP by `export_data.php`).
- Components: Header, Footer, PageView, CourseView, AudioPlayer, InteractiveLineReader, SearchView (Ctrl+K), Comments; `utils/contentParser.tsx` converts WP HTML/shortcodes.
- API: `worker/` → Cloudflare Worker `mikraot-api` on `mikraot.net/api/*`, D1 `mikraot-db`. Only `/api/comments` (GET/POST). POST auto-approves, no rate limit/captcha, CORS `*`.
- Leftovers to remove: `src/lib/supabase.ts`, deps `@supabase/supabase-js`, `pg`.
- Deploy today: `npm run build` → scp `dist/` to Bluehost `/home4/<bluehost-user>/public_html/staging/app/` (SSH directly to origin IP; Cloudflare doesn't proxy port 22).
- Live site is still WordPress. Staging app: https://mikraot.net/staging/app/

## Roadmap
1. **Security:** scrub secrets, rotate credentials, remove Supabase, audit git history, add secret scanning (e.g. gitleaks) pre-commit.
2. **Foundations:** ESLint + Prettier, strict tsconfig, Vitest + Playwright, update deps, real URL routing preserving WordPress URLs (SEO + old links, 301s where they differ), move static hosting to Cloudflare.
3. **Parity with original:** full inventory of mikraot.net pages/features; migrate missing ones — contact form, TablePress tables, LearnPress course progress/quizzes, Google sign-in, analytics, comment spam protection (Turnstile + moderation), media/MP3 hosting (e.g. R2).
4. **Launch:** GitHub + CI deploys, cutover plan with rollback, decommission WordPress/Bluehost only after sign-off.

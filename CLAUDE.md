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

- Astro builds one static page per WordPress URL (`src/pages/[...path].astro`, URLs from `src/lib/urls.ts`). Content currently comes from `src/data/siteData.json` (an older export of the WordPress staging copy), converted by `src/lib/wp-html.ts`; `src/scripts/content.ts` adds audio/collapsible/video behaviour in the browser. React only for islands (`Comments`).
- `wrangler.jsonc` configures the new single Worker `mikraot` (static assets + D1 binding `DB`); not deployed yet.
- Comments API: `src/pages/api/comments.ts` (on-demand route in the site Worker) using `src/server/comments.ts`; D1 schema in `migrations/`. Local dev/tests use a local D1 (`npm run db:local:reset` loads fictional fixtures).
- The old separate Worker `worker/` → `mikraot-api` on `mikraot.net/api/*` is still deployed and serves only the old staging app; remove it at cutover. Production D1 has no migration history yet: apply `migrations/` remotely (0001 is a no-op there) before the new Worker goes live.
- SEO head tags come from `src/data/seo.json`, captured from the live site by `npx tsx scripts/fetch-live-seo.ts`; after cutover edit that file directly.
- Media (76 MP3s, 52 images) is in `public/wp-content/uploads/`, at the same paths as on WordPress; content URLs are rewritten to site-relative `/wp-content/...`. Plugin folders and user avatars from WordPress uploads were deliberately not copied.
- Live site is still WordPress. Staging app: https://mikraot.net/staging/app/

## Procedures

- Dev server: `npm run dev` (http://localhost:4321, runs in Cloudflare's workerd). Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`.
- `.dev.vars` must exist (it may be empty): it stops wrangler from loading `.env`, whose operations credentials must never reach the Worker.
- SSH to Bluehost goes directly to the origin IP (`SSH_HOST` / `SSH_USER` in `.env`), because Cloudflare doesn't proxy port 22. The old staging app at /staging/app/ is no longer updated.
- Deploy the old API Worker: `npx wrangler deploy --config wrangler.json` from `worker/` (explicit config: the Astro build leaves a `.wrangler/deploy` redirect in the root). One-time `npx wrangler login` first.
- Query D1: `npx wrangler d1 execute mikraot-db --remote --command "..."`.

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
- API still lives in the old separate Worker: `worker/` → `mikraot-api` on `mikraot.net/api/*`, D1 database `mikraot-db`.
- Media (MP3s, images) is still served from WordPress `wp-content/uploads` on Bluehost.
- Live site is still WordPress. Staging app: https://mikraot.net/staging/app/

## Procedures

- Dev server: `npm run dev` (http://localhost:4321, runs in Cloudflare's workerd). Checks: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run build`.
- `.dev.vars` must exist (it may be empty): it stops wrangler from loading `.env`, whose operations credentials must never reach the Worker.
- SSH to Bluehost goes directly to the origin IP (`SSH_HOST` / `SSH_USER` in `.env`), because Cloudflare doesn't proxy port 22. The old staging app at /staging/app/ is no longer updated.
- Deploy Worker: `npx wrangler deploy` from `worker/` (after a one-time `npx wrangler login`).
- Query D1: `npx wrangler d1 execute mikraot-db --remote --command "..."`.

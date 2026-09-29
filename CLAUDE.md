# Mikraot.net

The website https://mikraot.net: a Hebrew site teaching Bible reading (pronunciation, grammar, cantillation), with courses, lessons, quizzes and audio.
Stack: React + TypeScript + Vite + Tailwind, Cloudflare (Workers, D1, static hosting), git → GitHub later.
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

## Architecture
- Frontend: all content bundled from `src/data/siteData.json` (340 items, exported from WP by `export_data.php` on the server). `utils/contentParser.tsx` converts WP HTML/shortcodes.
- API: `worker/` → Cloudflare Worker `mikraot-api` on `mikraot.net/api/*`, D1 database `mikraot-db`.
- Media (MP3s, images) is still served from WordPress `wp-content/uploads` on Bluehost.
- Live site is still WordPress. Staging app: https://mikraot.net/staging/app/

## Procedures
- Dev server: `npm run dev` (http://localhost:5173).
- Deploy frontend: `npm run build`, then scp `dist/` to Bluehost `/home4/<bluehost-user>/public_html/staging/app/`. SSH goes directly to the origin IP (`SSH_HOST` / `SSH_USER` in `.env`), because Cloudflare doesn't proxy port 22.
- Deploy Worker: `npx wrangler deploy` from `worker/` (after a one-time `npx wrangler login`).
- Query D1: `npx wrangler d1 execute mikraot-db --remote --command "..."`.

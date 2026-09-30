# Roadmap

## Target architecture (decided 2026-09-30)

- **Astro** static site: one HTML page per URL, preserving WordPress URLs; React only for interactive parts (audio, collapsibles, comments, quizzes).
- **One Cloudflare Worker** serves the static pages and `/api/*` (D1), replacing Bluehost hosting and the separate `mikraot-api` Worker. Same origin, so no CORS.
- **Content in git** as Astro content collections, one file per page, with custom blocks (audio, collapsible, YouTube) instead of WordPress shortcodes. Unpublished items excluded at build time.
- **Editing, both ways:** Arye in the browser via **Keystatic** (saves as git commits, needs GitHub); Claude edits the same files directly.
- **Media** (22 MB, incl. 76 MP3s) moves into the repo; no Bluehost dependency.
- **Search** via Pagefind (build-time index). **Fonts** self-hosted. **D1 schema** as migration files in the repo.
- **Tooling:** Vite (inside Astro), Vitest, Playwright, Oxlint, Prettier.

## 1. Security

- [x] Move credentials out of docs into `.env`
- [x] Remove Supabase client and unused deps
- [x] Scrub credentials, `node_modules` and `dist` from git history
- [x] Add secret scanning (gitleaks) as a pre-commit hook
- [x] Delete the pre-rewrite backup bundle once the new history is confirmed
- [x] Stop tracking `.idea/`
- [x] Delete Supabase API keys and reset its DB password
- [ ] Decide Supabase's fate together with the Google sign-in decision (checked 2026-09-30: its only data, 4 comments, is identical in D1)

## 2. Foundations

- [x] Update deps, clean package.json
- [x] Strict tsconfig (strict, noUncheckedIndexedAccess, verbatimModuleSyntax)
- [x] Oxlint (type-aware) + Prettier (typescript-eslint lacks TS 7 support)
- [x] Astro project skeleton: all 174 WordPress URLs as static pages, Cloudflare adapter, `wrangler.jsonc` for one Worker (TypeScript 6: `@astrojs/check` does not support TS 7 yet)
- [x] Vitest unit tests: URL generation and WordPress HTML conversion (`npm test`)
- [ ] D1 schema as migration files; move the comments API into the Astro Worker

## 3. Content migration

- [ ] Fresh export of all WordPress content, SEO meta (All in One SEO) and URLs
- [ ] Convert WordPress HTML/shortcodes to content files with custom blocks (audio, collapsible, YouTube, tables)
- [ ] Media into the repo; rewrite media URLs
- [ ] Keep every WordPress URL; 301 redirects where they must differ; sitemap
- [ ] Keystatic editor with the custom blocks (local first; browser editing after GitHub)
- [ ] Pagefind search, self-hosted fonts
- [ ] Playwright e2e: crawl the original and the new site and compare every page

## 4. Parity with original

- [ ] Full inventory of mikraot.net pages and features (crawl and compare)
- [ ] Courses, lessons and quizzes (LearnPress); quizzes are not shown anywhere yet
- [ ] Comments: moderation, Turnstile, rate limit
- [ ] Analytics (Cloudflare Web Analytics)
- [ ] Decide per plugin: Email Subscribers (newsletter + subscriber list), GamiPress (points/badges), BuddyPress (profiles), OptinMonster (popups), Nextend (Facebook login), Google sign-in
- Not needed: WPForms and TablePress (no forms or tables exist)

## 5. Launch

- [ ] GitHub + CI deploys (browser editing via Keystatic becomes available)
- [ ] **Move email off Bluehost** (`admin@mikraot.net` + 1 forwarder; MX `mail.mikraot.net`), e.g. Cloudflare Email Routing, before any decommission
- [ ] Cutover plan with rollback
- [ ] Decommission WordPress/Bluehost only after sign-off

## Known issues (current app)

- Search (Ctrl+K) was removed with the old single-page app; comes back with Pagefind.
- Comments: POST auto-approves, no rate limit or captcha, CORS `*`. (Raw DB errors no longer returned: fixed in `worker/`, not yet deployed.)
- `wp-html.ts` doesn't handle `[learn_press_*]` and `[elementor]` shortcodes or the 7 raw `<table>`s.
- The migration docs describe Playwright tests that aren't in the repo.

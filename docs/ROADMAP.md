# Roadmap

## 1. Security
- [x] Move credentials out of docs into `.env`
- [x] Remove Supabase client and unused deps
- [x] Scrub credentials, `node_modules` and `dist` from git history
- [x] Add secret scanning (gitleaks) as a pre-commit hook
- [ ] Delete the pre-rewrite backup bundle once the new history is confirmed
- [x] Stop tracking `.idea/`

## 2. Foundations
- ESLint + Prettier, strict tsconfig, Vitest + Playwright, update deps
- Real URL routing that preserves WordPress URLs (SEO and old links; 301s where they differ)
- Move static hosting to Cloudflare

## 3. Parity with original
- Full inventory of mikraot.net pages and features (crawl and compare)
- Migrate missing features: contact form, TablePress tables, LearnPress course progress/quizzes, Google sign-in, analytics, comment moderation, media/MP3 hosting (e.g. R2)

## 4. Launch
- GitHub + CI deploys
- Cutover plan with rollback
- Decommission WordPress/Bluehost only after sign-off

## Known issues
- Routing is hash-based (`#/slug`), which doesn't match WordPress URLs.
- 7 unpublished items (drafts/private) ship to visitors inside the JS bundle.
- Comments: POST auto-approves, no rate limit or captcha, CORS `*`, raw DB errors returned to the client.
- `contentParser` doesn't handle `[learn_press_*]` and `[elementor]` shortcodes or the 7 raw `<table>`s.
- `AudioPlayer` and `InteractiveLineReader` are unused.
- The migration docs describe Playwright tests that aren't in the repo.
- `tsc` reports 2 type errors; `package.json` has `"type": "commonjs"` in an ESM project.

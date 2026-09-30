# Roadmap

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
- [ ] ESLint + Prettier
- [ ] Vitest unit tests
- [ ] Worker: own tsconfig + Workers types
- [ ] Playwright e2e (with URL routing)
- Real URL routing that preserves WordPress URLs (SEO and old links; 301s where they differ)
- Move static hosting to Cloudflare

## 3. Parity with original

- Full inventory of mikraot.net pages and features (crawl and compare)
- Migrate missing features: contact form, TablePress tables, LearnPress course progress/quizzes (quizzes are not shown anywhere yet), Google sign-in, analytics, comment moderation, media/MP3 hosting (e.g. R2)

## 4. Launch

- GitHub + CI deploys
- Cutover plan with rollback
- Decommission WordPress/Bluehost only after sign-off

## Known issues

- Routing is hash-based (`#/slug`), which doesn't match WordPress URLs.
- 7 unpublished items (drafts/private) ship to visitors inside the JS bundle.
- Comments: POST auto-approves, no rate limit or captcha, CORS `*`, raw DB errors returned to the client.
- `contentParser` doesn't handle `[learn_press_*]` and `[elementor]` shortcodes or the 7 raw `<table>`s.
- The migration docs describe Playwright tests that aren't in the repo.

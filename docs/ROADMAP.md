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
- [x] Security headers: CSP (Astro, hashed inline scripts), HSTS, nosniff, frame-ancestors, Referrer-Policy, Permissions-Policy, COOP (`public/_headers`); `e2e/security.spec.ts` checks every feature works with no violations
- [x] Security review of the new build (local, 2026-10-02): no exposed files or source maps, CSRF blocked (Astro origin check), SQL parameterized, comments rendered as text. Fixed: comments for nonexistent pages, no rate limit (now 5/min per IP), no bot trap (honeypot field), unbounded body size, API responses without nosniff
- [ ] Decide Supabase's fate together with the Google sign-in decision (checked 2026-09-30: its only data, 4 comments, is identical in D1)

## 2. Foundations

- [x] Update deps, clean package.json
- [x] Strict tsconfig (strict, noUncheckedIndexedAccess, verbatimModuleSyntax)
- [x] Oxlint (type-aware) + Prettier (typescript-eslint lacks TS 7 support)
- [x] Astro project skeleton: all 174 WordPress URLs as static pages, Cloudflare adapter, `wrangler.jsonc` for one Worker (TypeScript 6: `@astrojs/check` does not support TS 7 yet)
- [x] Vitest unit tests: URL generation and WordPress HTML conversion (`npm test`)
- [x] D1 schema as migration files (`migrations/`); comments API in the Astro Worker (`/api/comments/`), unit + e2e tests on a local D1 with fictional fixtures. Before go-live: apply migrations to production D1 (approval needed)

## 3. Content migration

- [x] Fresh read-only export from live WordPress (`scripts/wp-export.php` → `.migration/wp-export.json`, gitignored): content, permalinks, menus, SEO, media, LearnPress structure. Findings (2026-09-30):
  - Content of all 340 items is identical to the old staging-based `siteData.json`.
  - All 174 generated page URLs match WordPress permalinks exactly — but LearnPress serves lessons and quizzes only inside their course (`/courses/<course>/lessons/<lesson>/`, `/courses/<course>/quizzes/<quiz>/`); standalone `/lessons/…/` and `/quizzes/…/` return 404 on the live site. Our 131 standalone lesson/quiz URLs must move under their course.
  - "Sample course" (published) is LearnPress demo content: 127 of the 131 lessons/quizzes, Latin filler text. Real course material: "טעמי המקרא" (1 test lesson with placeholder text + 1 real quiz) and the draft "ניקוד" (1 lesson + 1 quiz). **Decision needed (Arye):** drop the demo course?
- [x] Content files: 39 Markdoc pages/posts (5 drafts) in `src/content/pages/` with semantic tags; every conversion verified against the source, and every page against the live site (34/34 identical apart from typography; word sequences identical). Notes: the 2 header-less tables now render their first row as a header; build prints harmless MODULE_LEVEL_DIRECTIVE warnings (Astro Markdoc + bundler)
- [x] Media into the repo (`public/wp-content/uploads/`, 12 MB, same paths as WordPress; plugin data and user avatars excluded); all 33 media files referenced by published pages verified present; content media URLs made site-relative. Also fixed: `?page_id=` links now resolve to the page URL; staging URLs removed from link tooltips
- [x] SEO parity: titles, descriptions and og tags captured from the live pages (captured by `npm run seo:fetch`; now in each page's frontmatter), live favicon, sitemap (34 URLs) with `/sitemap.xml` → `/sitemap-index.xml` 301, `robots.txt`
- [x] Home page "latest posts" block (was missing)
- [ ] Open: WordPress feeds (`/feed/`, `/sitemap.rss`) are not replicated; decide whether they are needed
- [x] Keystatic editor, local mode (`npm run cms`): pages/posts with all custom blocks and the meaningful colours, site settings; every content file verified to open in it
- [ ] Keystatic: the Hebrew interface (needed for right-to-left editing) has poor built-in translations, e.g. Save = "להציל", Singletons = "רווקים" (could be fixed upstream); menu (`src/data/menu.json`) not editable there yet; GitHub mode for browser editing after GitHub
- [x] Self-hosted fonts (@fontsource: Assistant, Frank Ruhl Libre, Alef; Hebrew + Latin subsets)
- [x] Pagefind search (Ctrl+K / header button): 34 pages indexed at build; plain queries match text with niqqud. Possible refinement: leave the single-letter transliteration tables out of the index (they cause weak matches for queries with no real hit)
- [x] Playwright e2e basics (`npm run test:e2e`, desktop + mobile, against the production build in workerd): URLs, 404, collapsibles, comments, menu
- [x] Compare every page with the live site (`npm run compare:live`, after a build; report in `.migration/compare-report.md`): text, links, images, headings, lists, tables, collapsibles, audio and colour highlights. Result 2026-10-01: 33/34 pages identical except typography; the home page lacks the "latest posts" block (needs post dates: comes with the content migration)
- [ ] **Decision (Arye): typography.** WordPress shows ’ ” “ – where the content has ' " -. Options: match WordPress; proper Hebrew geresh/gershayim (׳ ״) with – dashes (recommended); or keep as typed

## 4. Parity with original

- [ ] Full inventory of mikraot.net pages and features (crawl and compare)
- [ ] Courses, lessons and quizzes (LearnPress): **deferred** (decided 2026-09-30); the new site has no course pages or links until then. Also deferred: the 7 LearnPress system pages (All Courses, Profile, Checkout, Instructor(s), Become A Teacher, Term Conditions). When migrating: lessons/quizzes are course-scoped URLs, and most published course content is the LearnPress demo "Sample course"
- [ ] Comments: moderation and/or Turnstile (Arye: comments are still published immediately; rate limit and honeypot done). Also: anyone can post under the name "מנהל האתר" (the admin badge itself can't be faked)
- [ ] Analytics (Cloudflare Web Analytics)
- [x] Accessibility: axe (WCAG 2.2 AA) passes on every page, desktop + mobile, incl. loaded comments, search dialog, mobile menu (`e2e/accessibility.spec.ts`). Fixed: brand green links/buttons (2.3:1) -> `brand-strong` #5b763e; footer, form hint, breadcrumb and status text
- [ ] **Decision (Arye): teaching colours vs. contrast.** Orange taught letters #ff6600 (2.9:1), grey context #c3c3c3 (1.8:1) and silent letters #d1cfcf (1.6:1) are below WCAG AA (4.5:1). Options: keep (meaning over contrast; excluded from the audit), or darker shades (e.g. orange #c2410c 5.2:1, grey #767676 4.5:1)
- [ ] Design differences seen in side-by-side screenshots (2026-10-01): the live site has a photo header banner (site name over the cottonbro image) and a sidebar with Archives, Categories and the newsletter sign-up; the new site has neither
- [ ] Decide per plugin: Email Subscribers (newsletter + subscriber list), GamiPress (points/badges), BuddyPress (profiles), OptinMonster (popups), Nextend (Facebook login), Google sign-in
- Not needed: WPForms and TablePress (no forms or tables exist)

## 5. Launch

- [ ] GitHub + CI deploys (browser editing via Keystatic becomes available)
- [ ] **Move email off Bluehost** (`admin@mikraot.net` + 1 forwarder; MX `mail.mikraot.net`), e.g. Cloudflare Email Routing, before any decommission
- [ ] Cutover plan with rollback
- [ ] Decommission WordPress/Bluehost only after sign-off

## Known issues (current app)

- Comments: POST auto-approves, no rate limit or captcha, CORS `*`. (Raw DB errors no longer returned: fixed in `worker/`, not yet deployed.)

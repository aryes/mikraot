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
- [x] Supabase's fate (decided 2026-10-03): not needed. Logins use Better Auth in our own Worker and D1; its only data (4 comments) is already in D1
- [ ] Delete the Supabase project (after a final export; approval needed)

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
- [x] SEO parity: titles, descriptions and og tags captured from the live pages (captured by `npm run seo:fetch`; now in each page's frontmatter), live favicon, sitemap (34 URLs) with `/sitemap.xml` → `/sitemap-index.xml` (302 until WordPress is retired, then 301), `robots.txt`
- [x] Home page "latest posts" block (was missing)
- [x] Keystatic editor, local mode (`npm run cms`): pages/posts with all custom blocks and the meaningful colours, site settings; every content file verified to open in it
- [ ] Keystatic: the Hebrew interface (needed for right-to-left editing) had poor built-in translations, e.g. Save = "להציל", Singletons = "רווקים": fixed 2026-10-08 by `patches/@keystatic+core+0.6.9.patch` (patch-package, applied by `npm run cms`). Still English, because hard-coded upstream: the editor toolbar's tooltips, "Paragraph", "Empty list" and the settings page's Save button (a fix belongs upstream); menu (`src/data/menu.json`) not editable there yet; GitHub mode for browser editing after GitHub
- [x] Pointed (vocalised) Hebrew, i.e. the biblical text, in **Taamey D** (free font for biblical text, `public/fonts/taamey-d/`, GPL with font exception), slightly larger; plain explanatory text in Noto Sans, darker. Chosen by Arye 2026-10-03 from side-by-side comparisons (Noto's marks looked faded; Taamey D for all text was too heavy for prose). Pointed words are found at build time (`src/lib/pointed.ts`), in content, titles and menus. Interface: self-hosted fonts (@fontsource): Noto Sans Hebrew (text) and Noto Serif Hebrew (headings), the free fonts that cover every niqqud and cantillation mark in the content (2026-10-03: Assistant, Frank Ruhl Libre and Alef had no טעמים at all, so browsers switched fonts inside words and showed boxes for rare marks; the live WordPress site sets no Hebrew font, so it depends on each visitor's device)
- [x] Pagefind search (Ctrl+K / header button): 34 pages indexed at build; plain queries match text with niqqud. Possible refinement: leave the single-letter transliteration tables out of the index (they cause weak matches for queries with no real hit)
- [x] Playwright e2e basics (`npm run test:e2e`, desktop + mobile, against the production build in workerd): URLs, 404, collapsibles, comments, menu
- [x] Compare every page with the live site (`npm run compare:live`, after a build; report in `.migration/compare-report.md`): text, links, images, headings, lists, tables, collapsibles, audio and colour highlights. Result 2026-10-01: 33/34 pages identical except typography; the home page lacks the "latest posts" block (needs post dates: comes with the content migration)
- [x] Typography (decided 2026-10-02: Hebrew): geresh ׳ and gershayim ״ in abbreviations (ו׳, תנ״ך), – for a spaced hyphen; quotation marks stay straight. Applied by the importer (`scripts/content/typography.ts`) to content, titles, SEO, menu and site settings; `compare:live` and the conversion check fold these differences

## 4. Parity with original

- [x] Full inventory of mikraot.net (2026-10-02: live sitemaps, WP-CLI on the server, URL probes). All 40 pages and the 1 post exist in the new site; all 4 approved comments are in D1 (the rest of WordPress's comments are spam; Akismet has caught 2,504). Not yet in the new site:
  - [x] Header banner (cottonbro photo with the page title and breadcrumb trail; site name and tagline on the front page) and sidebar with Archives and Categories (decided 2026-10-02: keep both; headings now in Hebrew). Posts show author, category and date links, as on the live site. The left sidebar (Recent Posts, Recent Comments) is configured but not shown on the live site
  - [ ] Sidebar newsletter form: Brevo's sign-up form (see the newsletter tasks below)
  - [x] Archive pages: month `/2021/08/`, category `/category/חדשות-האתר/`, author `/author/arye_s/` (each lists the one post)
  - [x] Feeds: `/feed/`, `/comments/feed/` (built by the Worker per request), `/category/חדשות-האתר/feed/`, `/sitemap.rss`; comments keep WordPress's `#comment-<id>` anchors
  - [x] Old link forms: `/?s=<query>` opens the search with the query; `/?p=<id>` and `/?page_id=<id>` go to the page (in the browser, via `/page-index.json`); `/page/<n>/` → home and `/category/uncategorized/` (WordPress's empty default category) → home (302 until WordPress is retired, then 301)
  - [x] BuddyPress pages `/פעילות/` (activity) and `/חברים/` (members, 4 users): redirect to the home page (302 until WordPress is retired, then 301) (see plugins)
  - LearnPress URLs (courses, 119 lessons, 12 quizzes, 159 questions): deferred, see below
  - Not public content: `/wp-json/`, `/wp-login.php`, `/xmlrpc.php` (gone after cutover; nothing links to them)
- [ ] Courses, lessons and quizzes (LearnPress): **deferred** (decided 2026-09-30); the new site has no course pages or links until then. Also deferred: the 7 LearnPress system pages (All Courses, Profile, Checkout, Instructor(s), Become A Teacher, Term Conditions). When migrating: lessons/quizzes are course-scoped URLs, and most published course content is the LearnPress demo "Sample course"
- [x] **Learner accounts for the courses** (decided 2026-10-03): individual learning, no teacher groups. **Hybrid:** learning starts at once with no account, progress and quiz results kept in the browser; optional sign-in copies them to an account and syncs across devices
  - Login tool: **Better Auth** (open-source library, runs in our Worker, accounts in D1, our own Hebrew RTL screens, free at any size). Chosen over hosted Supabase Auth and Clerk (user data with a third party)
  - Sign-in methods at launch, all free: **email link** (no password; sent via Brevo), **Google**, **Facebook**, **Microsoft**, **passkeys**. Apple later if wanted (Apple Developer Program, $99/year); no SMS (paid per message)
  - [ ] Arye: create the provider apps/keys (Google Cloud OAuth client, Meta for Developers app, Microsoft Entra app registration), keys into `.env` / Worker secrets; Claude guides each
  - [ ] Privacy policy: what an account stores (email, name, progress), how to delete it; account deletion in the profile
- [x] Comments: Turnstile human check (decided 2026-10-02: Turnstile, comments still published immediately), plus rate limit and honeypot. Built with Cloudflare's test keys
- [ ] At deploy: `wrangler secret put TURNSTILE_SECRET_KEY` (value in `.env`; widget "mikraot.net comments" created 2026-10-02, site key in `astro.config.mjs`)
- [x] Names reserved for the admin ("מנהל האתר", "admin", "מקראות"…) are refused, in the form and by the API, regardless of spacing, niqqud or case (`src/lib/reserved-names.ts`); the admin badge itself can't be faked
- [x] Accessibility: axe (WCAG 2.2 AA) passes on every page, desktop + mobile, incl. loaded comments, search dialog, mobile menu (`e2e/accessibility.spec.ts`). Fixed: brand green links/buttons (2.3:1) -> `brand-strong` #5b763e; footer, form hint, breadcrumb and status text
- [x] Teaching colours (decided 2026-10-04: "what works best"): taught letter #c2410c + bold, context #475569, silent letters #707070 + dotted underline. All meet WCAG AA (4.5:1) on every content background and have a cue besides colour; the accessibility audit now checks them too
- Plugins: every feature of every active plugin, with its replacement, is in `docs/PLUGINS.md` (checked 2026-10-03). Open items:
  - [x] **Periodic link check** (replaces Broken Link Checker): `e2e/links.spec.ts` crawls the site with linkinator (every internal link, image and `#anchor`) and checks every recording, on every test run; `npm run check:links` checks all outside links, weekly in CI (`.github/workflows/links.yml`; GitHub emails a failed run). First run 2026-10-04: all 180 outside links work (ykr.org.il blocks automated checkers, which is also the 1 "broken" link WordPress's checker reports; the check uses a browser-like user agent)
  - [x] **Email from the Worker**: Brevo's transactional API (free plan, 300 emails/day; Cloudflare's email sending needs the paid Workers plan). Domain authenticated in Brevo (DKIM, DMARC records added 2026-10-05); key in the Worker secret `BREVO_API_KEY` (Brevo key "worker", expires 2027-10: renew it and run `wrangler secret put BREVO_API_KEY` again)
  - [x] Email to Arye on every new comment (WordPress did this): `src/server/notify.ts`, sent in the background after the comment is saved; a failure is logged, never shown to the commenter; Reply-To is the commenter's email. Branch previews send nothing
  - [x] Reply to a specific comment (threaded replies, as on WordPress): "השיבו" button, replies nested under their comment, the API checks the parent is an approved comment on the same page. Needs migration `0003_comment_replies.sql` (adds `parent_id`) on production D1 before the new Worker goes live
  - [ ] Email the commenter when someone replies (Jetpack "notify me of follow-up comments"): can reuse `sendEmail` in `src/server/notify.ts`; needs an opt-in checkbox and an unsubscribe link
  - [x] Remember the commenter's name and email in the browser (opt-in checkbox, as on WordPress; `src/lib/commenter.ts`, localStorage, nothing sent)
  - [ ] Comment moderation page behind Cloudflare Access (approve, delete, edit, reply as admin)
  - [x] Structured data (JSON-LD: WebSite, WebPage, BreadcrumbList, BlogPosting, Person) and Twitter title/description, as All in One SEO output (`src/lib/structured-data.ts`, typed with schema-dts)
  - [x] Previous/next post links and related posts (same category) under posts (`src/components/PostNav.astro`; nothing shows while the site has a single post)
  - [ ] Uptime monitor with email alerts (replaces Jetpack Monitor)
  - [x] Renovate for dependency updates (replaces WordPress auto-updates): `renovate.json` (weekly pull requests, security fixes at once, 3-day release age, grouped Astro and dev tools, no auto-merge); active once the repo is on GitHub with the Renovate app installed
  - [ ] Preview URL per change (replaces staging): with the GitHub deploy pipeline
  - [ ] 2FA and login alerts on GitHub, Cloudflare and GoDaddy (replaces Wordfence 2FA and login alerts)
  - [x] Minor: images in the sitemap and `loading="lazy"`: not applicable (checked 2026-10-04: no page content has images; the only image is the banner, which must load first; images are off in the Keystatic editor). Revisit if content images are added
  - [ ] Before cutover: check WordPress.com for Jetpack subscribers; export Google Analytics history if wanted; when finishing the draft "משמעות הטעמים", take its content from Elementor's data (the page text is incomplete)
  - [x] **Newsletter: Brevo** (decided 2026-10-03; ready-made service, free plan: unlimited contacts, 300 emails/day, RSS campaigns, double opt-in, unsubscribe, open/click reports, EU company). Chosen over MailerLite (free plan cut to 250 subscribers) and building our own (Cloudflare email sending needs the paid Workers plan)
  - [x] Arye: create the Brevo account and API keys (into `.env`); Claude configures the rest via the API where possible. Done 2026-10-05: domain authenticated, sender "מקראות" <admin@mikraot.net>, list "ניוזלטר מקראות" with the 2 real subscribers from WordPress
  - [x] Announcements: an "updates" list (date + one-line note) on every page in Keystatic; posts are announced automatically. They feed the "מה חדש" page (`/מה-חדש/`), its RSS feed (`/מה-חדש/feed/`, for the Brevo campaign) and a sidebar box with the latest three
  - [ ] Brevo RSS campaign on that feed: weekly digest, only when there is something new; Hebrew right-to-left template; sender "מקראות"
  - [ ] Brevo sign-up form in the sidebar (CSP allowance for it), double opt-in and welcome email; Arye notified of new subscribers; block `mail.ru` as today
  - [ ] Import the 6 confirmed Email Subscribers contacts (and any Jetpack subscribers found on WordPress.com); the 16 unconfirmed are not imported
  - [x] Privacy policy: name Brevo as the newsletter processor; reports as totals (in the 2026-10-04 draft)
  - [x] **Statistics: Cloudflare Web Analytics** (decided 2026-10-03): free, no cookies, no consent banner (the live site loads Google Analytics with no consent banner at all). Covers visits, page views, referrers, countries, devices, page speed; no custom events (recordings played, exercises solved): if those are wanted later, Umami Cloud's free plan is the ready-made option
  - [ ] Set up Web Analytics for the new site at cutover with the manual beacon (not automatic injection, which would also change the live WordPress pages and doesn't fit the CSP); allow `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (connect) in the CSP
  - [x] Google Search Console for mikraot.net: Domain property verified 2026-10-05 (DNS TXT record, Arye's Google account). Collecting data from the WordPress site already, as a before/after baseline; submit `/sitemap-index.xml` at cutover
  - [ ] Before cutover: export the Google Analytics history if wanted, then remove GA with WordPress
  - [x] **Accounts** (decided 2026-10-03): the old WordPress accounts are not carried over (Arye's admin account, 2 spam sign-ups with no role, 1 Facebook subscriber inactive since January 2025); BuddyPress profiles/activity, GamiPress points and the Nextend Facebook login are dropped. New accounts come with the courses (below)
  - LearnPress (+ GamiPress integration): deferred, see above

## 5. Launch

Order (decided 2026-10-03): one change at a time; the site first, email last, Bluehost cancelled only after both.
Hosting after the move: Cloudflare (one Worker: pages, media, comments API, D1); free plan expected. The domain is registered at GoDaddy (renews by 2027-08-10) with DNS already on Cloudflare.

1. - [ ] Privacy policy: new Hebrew draft written 2026-10-04 (`privacy-policy`, still a draft, unpublished; the WordPress one was never published either). Arye to review (optionally a lawyer), then publish and link it from the footer and the comment/newsletter forms
2. - [x] GitHub: public repo https://github.com/aryes/mikraot (2026-10-04). Before the first push the history was rewritten again: author address → GitHub noreply, the old `MIGRATION_DOCUMENTATION*.md` (hosting account name, database name, Cloudflare account ID) removed, the hosting username masked. Secret scanning + push protection, Dependabot alerts, private vulnerability reporting and a `main` ruleset (no deletion or force-push) are on
   - [ ] Arye: confirm two-factor login on GitHub
   - [x] CAA records (2026-10-05): only Let's Encrypt, Google Trust Services, SSL.com, Sectigo (and the CAs Cloudflare adds itself) may issue certificates for mikraot.net; Bluehost's AutoSSL (Let's Encrypt) keeps working
   - [ ] DNSSEC: with the domain transfer from GoDaddy to Cloudflare Registrar (after the cutover; DNSSEC is then automatic). GoDaddy's API is closed to single-domain accounts
   - [x] Renovate installed (Dependency Dashboard: issue #1)
   - [x] Production Worker deployed to workers.dev (not mikraot.net); production D1 migrated (backup first); preview D1 `mikraot-db-preview` and Worker Previews tested: a comment on a preview lands in the preview DB only
   - [x] Automatic deploys from GitHub: Cloudflare Workers Builds connected 2026-10-04 (build `npm run build`, deploy `npx wrangler deploy` for `main`, `npx wrangler preview` for other branches = preview URL per branch)
   - [ ] Keystatic GitHub mode (browser editing)
3. - [ ] Cutover with rollback: plan drafted in `docs/CUTOVER.md` (2026-10-04, for Arye's review): a Worker route on the existing domain, DNS unchanged, rollback = removing the route. Then switch (approval needed). WordPress stays on Bluehost untouched as the fallback
4. - [ ] Retire WordPress after a few stable weeks (sign-off needed; full backup first)
5. - [ ] **Move email off Bluehost**, e.g. Cloudflare Email Routing. Today (checked 2026-10-03): MX `mail.mikraot.net` = the Bluehost web server; `admin@` is a mailbox there and also forwards to an outside address; SPF `v=spf1 a mx include:websitewelcome.com ~all`, DKIM `default._domainkey`; DMARC `p=none` added 2026-10-05 (for Brevo). Before switching: save the mailbox if wanted, and if WordPress still sends mail, put Bluehost's server explicitly in SPF (its `mx` entry stops covering it once MX moves). Rollback: restore the MX record. Then tighten DMARC (`p=quarantine`) once reports show only Brevo and the new mail host
6. - [ ] Cancel Bluehost only after sign-off (final backup of files, database and mailbox kept off the server)

## Known issues (current app)

- Old API Worker (`worker/`, no routes since 2026-10-05, so unreachable): comments POST auto-approves, no rate limit or captcha, CORS `*`.
- `npm audit`: 6 "high" findings, all one advisory in `http-cache-semantics` (GHSA-ch52-4w7c-c8xp, published 2026-09-18, no fixed version yet), reached via Astro. Not exploitable here: it concerns shared caches serving several users, and Astro uses it only at build time to cache remote images, which this site has none of. `npm audit fix --force` would downgrade Astro to v2: don't. Recheck when a fix ships

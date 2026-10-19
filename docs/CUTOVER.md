# Cutover plan

Switching mikraot.net from WordPress (Bluehost) to the new Worker `mikraot`, with a rollback that
takes seconds. Nothing here runs without Arye's go-ahead; each **Approval** line is a stop.
Revised 2026-10-05 after two fresh-eyes reviews.

**Principle:** DNS doesn't change. The switch is a Cloudflare _Worker route_ on the existing,
proxied domain: requests to `mikraot.net/*` go to the new Worker; everything else (www, mail,
cPanel subdomains) still reaches Bluehost. WordPress stays running and untouched, so rollback =
removing the route.

**Routes and workers.dev live in `wrangler.jsonc`:** every push to `main` runs `wrangler deploy`,
which applies the config, so the config is the source of truth and the switch is a reviewed
commit. (Rehearsed: a deploy does not remove routes missing from the config; it adds the ones in
it. So a route deleted in the dashboard only comes back if it's still in the config.)

Current state (2026-10-05): no Worker routes on the zone (the old `mikraot-api` routes were deleted). `www.mikraot.net` → WordPress, which
301-redirects to `https://mikraot.net/`. No Page Rules; Rocket Loader and minification off.

## 1. Before the switch

On the switch day, `npm run cutover:check` reruns the checks marked "again on the switch day"
below (URL parity, content, Cloudflare rules, the WordPress freeze) and makes the fresh database
export, ending with PASS or FAIL for each (first run 2026-10-08: all passed).

- [x] Production D1 backed up and migrated; Worker deployed to workers.dev with its Turnstile
      secret (2026-10-04, approved).
- [ ] Launch items in `docs/ROADMAP.md` done or consciously deferred: privacy policy published (done 2026-10-13),
      visitor statistics (Umami) ready, which start counting once mikraot.net serves the new site. Email to Arye on new comments: built (Brevo, 2026-10-05).
- [x] An **uptime monitor** with email alerts set up (replaces Jetpack Monitor): UptimeRobot, free
      plan, `https://mikraot.net/` every 5 minutes, emails Arye (his account, 2026-10-08).
- [x] **URL parity gate:** every URL in WordPress's sitemaps, Search Console's top pages and the
      known old link forms (`/?p=`, `/?page_id=`, `/?s=`, `/feed/`, `/comments/feed/`,
      `/sitemap.xml`, `/robots.txt`, `/page/2/`, `/category/…`, `/author/…`) checked against the
      workers.dev address: 200, or a deliberate redirect or 404:
      `npm run check:urls -- <address> [--urls <Search Console Pages.csv>]`;
      `npm run compare:live` for content. Passed 2026-10-08: of 353 URLs (Search Console's 8 pages
      included), 53 pass and 0 fail; the other 300 are LearnPress course URLs, deferred with the
      courses (`docs/ROADMAP.md`). Content the same except typography and the video posters. Run
      again on the switch day.
- [ ] **Pages changed on purpose** (decided with Arye 2026-10-15, to do with the switch-over
      preparation): give `scripts/compare-with-live.ts` a list of the pages edited since the import,
      each with its reason, reported as "changed on purpose" so a real difference stands out on the
      switch day. Today (14): `/` (link to מה חדש, the email-updates box, the pointed "דברי הימים" heading), `/טעמים-נדירים/` and
      `/טעמים/1-word-2-tropes/` (corrected telisha on קִ֠רְב֞וּ), the two recordings pages (the
      picker), `/דגש-קל/`, `/מבטא/` and `/תנועות-עיצורים-וניקוד/` (grouped table headings; דגש קל
      also one more link), `/סמיכות/`, `/קמץ-קטן/` and `/משה-מוציא-וכלב-מכניס/` (one more link), `/טעמים/נוסח-אשכנז/` and `/שיטת-גלגלי-עזר/` (ואַזְלָ֜א pointed: וְאַזְלָ֜א), `/silent-letters/` ("הי׳ והה׳").
- [x] The Turnstile widget's hostnames include `mikraot.net` (set at creation, 2026-10-02).
- [x] **Comments tested before the switch** (2026-10-05): with the workers.dev hostname briefly
      allowed in the Turnstile widget, Arye posted a real comment from his browser (automated
      browsers are blocked by Turnstile, as intended); it was stored and shown, then hidden
      (`UPDATE comments SET approved = 0 WHERE id = 6`: the row stays in D1, the API no longer
      returns it), and the hostname removed again.
- [x] Zone rules audited: Redirect, Transform, Cache, Configuration and Origin rules must not touch
      `mikraot.net/*` responses. Checked 2026-10-08 through the API: none exist, no Page Rules, and no
      account-level Bulk Redirects; the zone has only Cloudflare's managed URL normalization, free
      managed firewall and DDoS rulesets. Check again on the switch day.
- [ ] **Content freeze on WordPress.** Carry over content edited and comments approved on
      WordPress since the export (2026-09-30). Checked 2026-10-08 (WP-CLI, read-only): nothing to
      carry over; the last post or page edit is from January 2025, the last comment from November
      2023, and no comments await approval. Check again on the switch day.
- [x] Branch previews ignore `workers_dev` (tested 2026-10-05: a preview built with
      `workers_dev: false` answered 200). The production deploy does apply it, and `preview_urls`
      may default to the same value, so the switch sets `preview_urls: true` explicitly.
- [x] Rollback rehearsed 2026-10-05 on `mikraot.net/__rollback-rehearsal/*`: adding the route took
      effect in 6 s, deleting it in 5 s; a Workers Builds deploy whose config has no routes left the
      route in place. So a revert commit alone does not roll back: delete the route first (step 4).
- [x] **Approval:** delete the old `…/api/*` → `mikraot-api` routes ahead of the switch (only the old
      staging app uses them; WordPress doesn't use `/api/`), and remove them from
      `worker/wrangler.json` so a redeploy of the old Worker can't bring them back. More specific
      routes win, so while they exist comments would go to the old Worker.
- [x] Redirects in `public/_redirects` (`/sitemap.xml`, `/page/*`, `/category/uncategorized/`, BuddyPress) as 302 during the
      fallback weeks: browsers keep 301s, which would survive a rollback. Back to 301 in step 5.
- [ ] A fresh production D1 export the same day (`npm run cutover:check` makes it).
- [ ] **Approval (go/no-go)**, with a fixed date and time (a quiet hour) and the observation
      window below.

## 2. The switch (one commit, about 15 minutes)

1. One commit to `wrangler.jsonc`: route `mikraot.net/*` → `mikraot`, `workers_dev: false` and
   `preview_urls: true` (keeps branch previews); in the same commit, `DEPLOYED_URL` in
   `.github/workflows/deployed.yml` becomes `https://mikraot.net` (workers.dev goes away).
   It goes through a pull request like any change: `main` accepts only commits whose checks
   passed, with no bypass (ruleset "Tests must pass"), so a direct push would be refused. A day or
   two ahead, open it with green checks and **without auto-merge** (which would merge, and so
   switch, whenever the checks finish). At the agreed hour Claude merges it by hand (`gh pr merge --rebase`); its
   deploy (Workers Builds) **is** the switch. Not on a Monday morning, when Renovate merges its
   updates; and no other pull request may have auto-merge on at that time (`gh pr list`; switch it
   off with `gh pr merge --disable-auto <number>`): Renovate's security updates come any day. If
   `main` moved after the checks ran, update the pull request (`gh pr update-branch --rebase`) and
   let its checks run again (about 4 minutes) first, so the switch deploys a tested whole. Right after the merge, open
   its revert (`git revert`) as a pull request too, likewise without auto-merge, so a rollback's
   step 3 needs only a merge.
   Right after that deploy, point the Brevo newsletter webhook at
   `https://mikraot.net/api/newsletter-webhook/` (`PUT /v3/webhooks/<id>`): it is on the
   workers.dev address, which the switch turns off, so confirmations would get no welcome email.
2. www is not routed: WordPress keeps redirecting it to mikraot.net during the fallback period.
3. WordPress admin is **not** reachable during the fallback period (its scripts, styles and API
   live under paths the new site now serves). It's only needed after a rollback, and content is
   frozen anyway. cPanel and webmail stay reachable through their own hostnames
   (`cpanel.mikraot.net`, `webmail.mikraot.net`), not through paths on mikraot.net.

## 3. Right after (observation window: 2 hours, then daily for a week)

Success means all of these:

- [ ] The route exists (API) and mikraot.net answers from the new Worker: not yet tested is whether
      the Workers Builds deploy creates a route from the config (its token may lack route rights).
      If it didn't, add it via the API at once, then investigate.
- [ ] A branch preview still works (`preview_urls: true`).
- [ ] Email addresses on pages are obfuscated by Cloudflare (Scrape Shield), as for WordPress.
- [ ] The URL parity checks from step 1 pass against `https://mikraot.net`, plus
      `npm run check:links -- https://mikraot.net` and `npm run test:deployed -- https://mikraot.net`.
- [ ] A real test comment posts, appears, and is hidden again (approval for the D1 change). It also
      proves the human check's hostname and action checks, which only the real key runs.
- [ ] A real test sign-up from the footer: confirmation email, `/newsletter/confirmed/`, welcome
      email and Arye's notice (`docs/OPERATIONS.md`, Newsletter). The form can't be tried before:
      the human check's key works only on mikraot.net.
- [ ] Response headers (CSP, HSTS…) present; no console errors or CSP blocks on a few pages.
- [ ] Umami receives visits (it counts only on mikraot.net); Search Console: submit `/sitemap-index.xml`, then review queries and titles a month or two later (`docs/ROADMAP.md`).
- [ ] A Cloudflare rate limiting rule (the free plan has one, counted per IP over 10 seconds, action
      block; checked 2026-10-08; Security → WAF → Rate limiting rules) on all of `mikraot.net`
      (unknown addresses run the Worker too, not only `/api/*`), with a threshold well above normal
      browsing, e.g. 300 requests per 10 seconds per IP: it blocks a flood before the Worker runs,
      so it can't use up the free 100,000 requests a day (`docs/OPERATIONS.md`, Limits). Needs
      Arye's approval (zone configuration; the token can't write WAF rules).
- [ ] Sentry and the Workers logs read for new kinds of errors (browser errors in Sentry come
      from visitors' browsers: untrusted input, anyone can write them), and the error rate below 1% of requests over the
      observation window (Cloudflare dashboard →
      Workers → mikraot → Observability).

**Rollback triggers** (Arye or Claude, immediately, no discussion needed): the site or a page
type down; 5xx errors above 1%; pages from the parity list missing; comments failing; a security
header or CSP problem breaking pages.

## 4. Rollback (seconds via the dashboard)

1. **Freeze merges into `main`**, except the revert in step 3: any other deploy would bring the
   route back while the config still contains it. Switch off auto-merge on every open pull request
   (`gh pr list`, then `gh pr merge --disable-auto <number>`; Renovate's included) and open no new
   ones until step 3 is done. The revert's own checks take about 4 minutes; the site is already
   back on WordPress from step 2, so only this freeze matters meanwhile.
   Without Claude (Arye, from the browser): Cloudflare → Workers & Pages → mikraot → Settings →
   Builds → Disconnect stops every deploy instead (`docs/GUIDE.md`, "If Claude is unavailable").
2. **Delete the `mikraot.net/*` route** (Cloudflare API or dashboard: Workers → mikraot →
   Settings → Domains & Routes). WordPress serves the site again at once; no cache purge needed.
3. Merge the revert pull request opened right after the switch (`gh pr merge --rebase`: the
   whole switch commit undone, route out of `wrangler.jsonc` and `workers_dev` back on). It doesn't remove routes itself; it keeps a later deploy from re-adding
   the route. Confirm the route is still gone after that deploy.

Comments posted on the new site in between stay in D1 and are not shown by WordPress; they
reappear when switching forward again. Point the Brevo newsletter webhook back at the workers.dev
address once it is on again, or people who confirm after the rollback get no welcome email.

## 5. After a few stable weeks

- [ ] Redirects in `public/_redirects` back to 301.
- [ ] **Approval:** retire WordPress (full backup of files, database and mailbox first, kept off
      the server). Before that: a Cloudflare redirect rule `www.mikraot.net/*` →
      `https://mikraot.net/$1` (301), replacing WordPress's.
- [ ] Remove the old Worker `mikraot-api`, the `worker/` folder and `/staging/` on Bluehost.
- [ ] Sentry → javascript-astro → Settings → Allowed Domains: remove
      `mikraot.mikraot-app.workers.dev` (the switch turns workers.dev off).
- [ ] Move email off Bluehost (`docs/ROADMAP.md`, launch step 5), then cancel Bluehost.
- [ ] Move the domain to Cloudflare Registrar; DNSSEC on.

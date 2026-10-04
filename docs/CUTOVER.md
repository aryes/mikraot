# Cutover plan (draft for Arye's review)

Switching mikraot.net from WordPress (Bluehost) to the new Worker `mikraot`, with a rollback that
takes seconds. Nothing here runs without Arye's go-ahead; each **Approval** line is a stop.

**Principle:** DNS doesn't change. The switch is a Cloudflare _Worker route_ on the existing,
proxied domain: requests that match the route go to the new Worker, everything else still reaches
Bluehost. WordPress stays running and untouched, so rollback = removing the route.

Current state (checked 2026-10-04): routes `mikraot.net/api/*` and `www.mikraot.net/api/*` →
`mikraot-api` (old Worker, serves only the old staging app).

## 1. Before the switch (days before)

- [ ] Launch items in `docs/ROADMAP.md` done or consciously deferred: privacy policy published,
      GitHub + CI deploys, Web Analytics beacon ready.
- [ ] **Content freeze on WordPress** (no edits there from now on). Check for content edited and
      comments approved on WordPress since the export (2026-09-30); carry them over.
- [ ] **Backup the production database:** `npx wrangler d1 export mikraot-db --remote --output
backups/d1-<date>.sql` (kept outside the repo).
- [ ] **Approval:** apply `migrations/` to production D1 (`npx wrangler d1 migrations apply
mikraot-db --remote`): 0001 records the existing schema (no change), 0002 adds an index,
      0003 adds `parent_id` for replies. Old Worker keeps working (it ignores the new column).
- [ ] Worker secret: `npx wrangler secret put TURNSTILE_SECRET_KEY` (value in `.env`).
- [ ] **Approval:** first deploy of the Worker `mikraot` (no route yet: reachable only at its
      workers.dev address). Check pages, search, audio, feeds, headers there. Comments can't be
      tested on workers.dev (the Turnstile widget only accepts mikraot.net); they are tested right
      after the switch.

## 2. The switch (about 15 minutes, at a quiet hour)

- [ ] **Approval (go/no-go).**
- [ ] Add route `mikraot.net/*` → `mikraot`, and `www.mikraot.net/*` → `mikraot` (the site's
      `www` links then also work).
- [ ] Keep WordPress's admin reachable during the fallback period: routes `mikraot.net/wp-admin/*`
      and `mikraot.net/wp-login.php*` with **no Worker** (they go to Bluehost).
- [ ] Remove the two `…/api/*` → `mikraot-api` routes (the new Worker serves `/api/` itself).
- [ ] Purge the Cloudflare cache (old WordPress pages may be cached at the edge).

## 3. Right after the switch

- [ ] Run the link checks against the live site: `npm run check:links -- https://mikraot.net`
      (outside links) and the internal crawl; spot-check pages, search, audio, feeds and redirects.
- [ ] Post one real test comment, check it appears, then hide it (approval for the D1 change).
- [ ] Check the response headers (CSP, HSTS…) and that nothing in the browser console is blocked.
- [ ] Cloudflare Web Analytics receives visits; Search Console: submit `/sitemap-index.xml`.
- [ ] Watch the Worker's logs and errors for the first hours (Workers observability).

## 4. Rollback (any time, seconds)

1. Delete the routes `mikraot.net/*` and `www.mikraot.net/*` (and the "no Worker" exclusions).
2. Restore `mikraot.net/api/*` and `www.mikraot.net/api/*` → `mikraot-api`.
3. Purge the cache.

WordPress serves the site again immediately. Comments posted on the new site in between stay in
D1 (WordPress never showed D1 comments anyway); nothing is lost.

## 5. After a few stable weeks

- [ ] **Approval:** retire WordPress (full backup of files, database and mailbox first, kept off
      the server).
- [ ] Remove the old Worker `mikraot-api`, the `worker/` folder and `/staging/` on Bluehost.
- [ ] Move email off Bluehost (`docs/ROADMAP.md`, launch step 5), then cancel Bluehost.

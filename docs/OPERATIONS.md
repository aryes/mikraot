# Operations

How to recover when something goes wrong, and the limits and assumptions the site depends on.
Each limit names its source and when it was checked; recheck before relying on one. Keep this file
current: a new service, limit or procedure is added here in the same pull request.

## When something goes wrong

First: `npx wrangler whoami` (if it isn't logged in: `npx wrangler login`). Workers Logs keep only
3 days on the free plan, so read them promptly.

### An email "תקלה במקראות"

The site emails Arye when a request ends in a server error or the daily backup fails
(`src/server/alerts.ts`; at most one email per kind per hour).

1. Open the error in Sentry (sentry.io → mikraot → Issues; server and browser errors, with the
   stack trace), and the Worker logs around the time in the email (Cloudflare dashboard → Workers →
   mikraot → Observability → Logs; "POST /api/comments failed", the backup's error).
2. If a deploy caused it: roll back (below), then fix through a pull request.
3. If D1 or KV is failing on Cloudflare's side: <https://www.cloudflarestatus.com>. Nothing to do
   but wait; the static pages keep working, only comments are affected.
4. "POST /api/comments" or "POST /api/newsletter" with "Turnstile siteverify" or a timeout in
   the logs: Cloudflare's human check didn't answer within 5 seconds
   (`src/server/turnstile.ts`). Check cloudflarestatus.com (Turnstile); visitors were asked to try
   again.

### UptimeRobot: the site is down

UptimeRobot (Arye's account) checks `https://mikraot.net/` every 5 minutes and emails Arye.

1. Open the site; check <https://www.cloudflarestatus.com>.
2. If the last deploy broke it: roll back (below).

### A deploy that failed

Each merge into `main` is deployed by Workers Builds, reported as the "Workers Builds: mikraot"
check on the commit (its link opens the build log). Only a successful build becomes the active
deployment, so after a failed one the previous version stays live: nothing breaks, the merged
change just isn't out yet. If the log ends in a Cloudflare API
error (e.g. 2026-10-19: code 10013 during the asset upload, gone on the next build), it was
Cloudflare's side: the next merge deploys everything on `main`, or retry it in the dashboard
(Workers & Pages → mikraot → Deployments → View build history → the build's "…" → Retry build). An error in our build steps
(type check, html-validate) needs a fix through a pull request.

### Roll back a bad deploy

- **The Worker** (any time): `npx wrangler deployments list --config wrangler.jsonc` to find the
  last good version, then `npx wrangler rollback <version-id> -m "<reason>" --config wrangler.jsonc`
  (or the dashboard: Workers → mikraot → Deployments). Then revert the commit through a pull
  request, or the next merge deploys it again. Check the site afterwards:
  `npm run test:deployed -- https://mikraot.net` (after a local `npm run build:site` of the
  rolled-back commit). A rollback changes only the code: a database migration that came with the bad
  deploy stays, and is undone by restoring the database (below).
- **Back to WordPress** (in the weeks after the switch): `docs/CUTOVER.md`, step 4.

### Restore the database

`npm run db:restore` prints the instructions (targets, steps, options). In short: without `--yes`
it only shows the plan (rows now, rows after); with `--yes` it exports the current database to
`.backups/` (git-ignored: it holds commenters' emails), prints the command that undoes it (a
return to a minute before, from the database's history; printed first, so it's there even if the
restore fails), restores, and shows the rows after. It
changes production data, so: show Arye the plan, and add `--yes` only with his approval.

- **A time within the last 7 days**, with its zone (e.g. `2026-10-07T09:30:00Z` in UTC, or
  `…+03:00` in Israel summer time): D1's own history (Time Travel), to the minute. An older time
  fails already in the plan (the free plan keeps 7 days). The whole database returns to that
  moment, so comments posted since are lost (they are in the export).
- **A date, or `latest`:** that day's backup in Workers KV (`d1/<date>.json`, written at 02:17
  UTC, kept ~13 months). The tables in the backup get its rows; other tables are left alone. If a
  migration changed the tables after the backup was taken, edit the generated
  `.backups/restore-<date>.sql` to fit, and load it with
  `npx wrangler d1 execute mikraot-db --remote --config wrangler.jsonc --file <it>`.

Afterwards: check the comments on a page, re-apply the deletions listed below that are newer than
the restored state, then delete the files in `.backups/`. Tested 2026-10-08: locally (`--local`),
comments wiped and restored with the same rows and reply links; the Time Travel plan against
production (read-only).

### Emails Brevo refused

Comment notices, reply notices and error alerts that Brevo refuses (its free 300 a day used up,
or Brevo down) wait in the Cloudflare Queue `mikraot-email-retry` and are sent again every hour for up to 22 tries, about a day (alerts: 3 tries, since a day-old backlog of alerts would use up the renewed quota) (`src/server/email.ts`). Each failed try is in the Worker logs;
one given up says "given up after … tries". An email Brevo accepted but answered with an error is sent twice (rare). What is waiting: Cloudflare dashboard → Storage &
databases → Queues → mikraot-email-retry. Queued emails hold the email's text and addresses for
at most 24 hours. Newsletter confirmations are not retried (the visitor is told instead: whenever Brevo sends nothing, whether down, out of quota or refusing the address, the form says nothing was sent and to try later or write to admin@mikraot.net, and the Worker emails Arye; one message for every failure, since Brevo's codes don't reliably tell these apart), nor (for now) the welcome email and its notice to Arye: a failure there is logged only.

### Hide a comment

Arye hides a comment, or shows it again, from the "ניהול התגובה" link in its new-comment email:
a page with the comment and one button (`src/pages/comments/manage.astro`). The link is signed
with the Worker secret `COMMENT_MANAGE_SECRET` (random, set 2026-10-19; kept nowhere else), names
one comment, and doesn't expire. Replacing the secret
(`npx wrangler secret put COMMENT_MANAGE_SECRET --config wrangler.jsonc`) makes every link
already sent stop working ("הקישור אינו תקין"): do it if an email with these links reached
someone who shouldn't have them. Without the secret (previews) emails go out without the link.
The Worker logs record full request addresses, these links included (as with the unsubscribe
links): don't paste log lines with them anywhere public.

### Delete a comment or an email on request

The privacy policy promises deletion on request, and that a restore from an older backup won't
bring the data back. So:

1. Delete the row (with Arye's approval):
   `npx wrangler d1 execute mikraot-db --remote --config wrangler.jsonc --command "DELETE FROM comments WHERE id = <id>"`
   (only the email: `UPDATE comments SET author_email = NULL, notify_replies = 0, unsubscribe_token = NULL WHERE id = <id>`). If the comment has
   replies, the database refuses the `DELETE` (each reply points to it); erase it instead:
   `UPDATE comments SET author_name = '', author_email = NULL, content = '', approved = 0, notify_replies = 0, unsubscribe_token = NULL WHERE id = <id>`.
   Hiding a comment (`SET approved = 0` alone, or the "ניהול התגובה" link in its email) is not
   deletion: its text and email stay.
2. Add a line to the list below: date, comment number, and what was deleted. Numbers only, never
   names or emails (this file is public).
3. Backups taken before the deletion keep the row until they expire (~13 months); after any
   restore, run step 1 again for every line here newer than the restored state.

Deletions on request (date, comment id, what):

- none yet

### Newsletter (Brevo)

Sign-ups are limited per visitor (3 a minute) and per address (1 confirmation a minute), behind
the human check, but there is no daily total (Arye, 2026-10-19: WordPress had none and saw only a
trickle of fake sign-ups; Brevo's 300 a day is far above real use). If abuse ever uses up the
quota, the Worker logs show refused confirmations, and comment and reply notices and alerts wait in the retry queue
(above); a daily cap is then the fix.

The footer form (`src/components/NewsletterSignup.tsx`) posts to `/api/newsletter/`, which asks
Brevo for a double opt-in: Brevo emails the confirmation link (template 5, "מקראות – אישור הרשמה
(עברית)") and adds the address to list 4 ("ניוזלטר מקראות") once it is clicked, then sends the
visitor to `/newsletter/confirmed/`. Brevo then calls `/api/newsletter-webhook/` (a marketing
webhook, event `listAddition`, with the header `X-Webhook-Secret` holding the Worker secret
`NEWSLETTER_WEBHOOK_SECRET`), which sends the welcome email and a notice to Arye. IDs and paths
(list, template, confirmation page) are in `src/server/newsletter.ts`, the webhook in its route
file; the template and the webhook (with its header) were made through Brevo's API.

- The welcome email has its own unsubscribe link (`/newsletter/unsubscribe/`, and mail apps'
  one-click unsubscribe): a token signed with the same secret, so changing
  `NEWSLETTER_WEBHOOK_SECRET` makes the links in welcome emails already sent stop working (they
  then point to "הקישור אינו תקין", which names admin@mikraot.net). Newsletters carry Brevo's own
  unsubscribe link. The welcome email's links always point to mikraot.net (not workers.dev,
  which the switch turns off), so they work from the switch on.
- **Adding contacts by hand or by import** (Brevo's dashboard or API) fires the same webhook:
  each one gets the welcome email, and Arye a notice. For a bulk import, delete the webhook first
  and create it again after (`POST /v3/webhooks`, `type: marketing`, `events: ["listAddition"]`,
  the URL and header above; a new secret means `npx wrangler secret put NEWSLETTER_WEBHOOK_SECRET
--config wrangler.jsonc` too).
- If Brevo retries a webhook it had already delivered, the welcome is sent twice (no
  de-duplication: rare, harmless).
- Confirmation and welcome emails come out of the same 300 a day as the comment notices. Over
  the limit Brevo refuses the confirmation: the visitor still sees "we sent you an email" (the
  same answer for every refusal, so the form can't reveal who subscribed) but gets none; the
  refusal is in the Worker logs ("Brevo double opt-in failed").

### Before they expire

- `CF_CONFIG_API_TOKEN` (the scoped Cloudflare token in `.env`): expires **2027-01-31**. Arye
  creates a new one with the same permissions (CLAUDE.md, Secrets policy) before then.
- `CF_PREVIEWS_API_TOKEN` (GitHub secret, since 2026-10-15; expiry: as set when created): edit rights on Workers scripts in
  this account, used only by `.github/workflows/previews.yml` to delete a pull request's Cloudflare
  Preview when it closes. If it expires or is revoked, that workflow fails on each merge or close and old
  Previews stay public (no data, test settings) until a new token is saved under the same name.
- **The domain** mikraot.net: registered at GoDaddy, paid until **2027-08-10** (registry record,
  checked 2026-10-19). Arye confirms automatic renewal in GoDaddy, or renews before then;
  `docs/CUTOVER.md` step 5 plans its move to Cloudflare Registrar.
- `security.txt` expires 330 days after the build (`src/lib/security-txt.ts`); every deploy renews
  it, so it only lapses if nothing is deployed for 11 months.

## Limits and assumptions

The site runs on free plans. "What happens" is what a visitor or Arye would see when the limit is
reached.

| What                                                                        | Limit (free)                                                                                              | We use (2026-10-08)                                                                                                        | What happens at the limit                                                                                     | Source, checked                                                                                                 |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Worker requests                                                             | 100,000 a day; static pages don't count                                                                   | API, comments feed, unknown addresses (404), each MP3 request (Safari: 2+ per play)                                        | Those fail until 00:00 UTC; pages keep working                                                                | [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), 2026-10-08                        |
| Workers Builds (deploys and branch previews)                                | 3,000 build minutes a month; 1 build at a time; 20 minutes each                                           | One build per pull-request push and per merge (not measured: Workers & Pages → mikraot → Deployments → View build history) | Builds stop until the month ends: merges and previews are not deployed (the live site keeps the last version) | [Workers Builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/), 2026-10-19 |
| Worker CPU time                                                             | 10 ms per request and per scheduled run                                                                   | Small API calls; backup of 45 KB                                                                                           | Error 1102 for that request or run                                                                            | Workers limits, 2026-10-08                                                                                      |
| Cron triggers                                                               | 5 per account                                                                                             | 1 (daily backup)                                                                                                           | No more schedules can be added                                                                                | Workers limits, 2026-10-08                                                                                      |
| Workers Logs                                                                | Kept 3 days; 200,000 events a day                                                                         | A few hundred lines a day                                                                                                  | Older logs are gone; read them promptly                                                                       | [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), 2026-10-08          |
| D1 storage                                                                  | 500 MB per database (5 GB per account)                                                                    | 45 KB                                                                                                                      | New comments can't be saved                                                                                   | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), 2026-10-08                                  |
| D1 rows                                                                     | 5 million read, 100,000 written a day                                                                     | ~3,500 read a day                                                                                                          | Comments stop loading until 00:00 UTC                                                                         | D1 pricing, 2026-10-08                                                                                          |
| D1 history (Time Travel)                                                    | 7 days                                                                                                    |                                                                                                                            | Older states need the KV backup                                                                               | [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), 2026-10-08                          |
| KV storage                                                                  | 1 GB; 1,000 writes and 100,000 reads a day                                                                | ~16 MB a year of backups; ~2 writes a day                                                                                  | Backups or alert throttling fail                                                                              | [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/), 2026-10-08                                |
| Queues (emails waiting for a retry)                                         | 10,000 operations a day (about 3 per queued email, plus 1 per retry: at most ~25); messages kept 24 hours | None normally: only emails Brevo refused                                                                                   | Retries stop until 00:00 UTC; an email still unsent after 24 hours is dropped (logged)                        | [Queues pricing](https://developers.cloudflare.com/queues/platform/pricing/), 2026-10-19                        |
| KV value size                                                               | 25 MiB                                                                                                    | 45 KB per backup                                                                                                           | The backup fails (error email)                                                                                | KV limits, 2026-10-08                                                                                           |
| Analytics Engine (searches not found)                                       | 100,000 writes, 10,000 queries a day; 3 months kept                                                       | A few a day                                                                                                                | Reports dropped; older data gone after 3 months                                                               | [Analytics Engine pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/), 2026-10-08   |
| Brevo (comment notices, error mails, newsletter confirmations and welcomes) | 300 emails a day                                                                                          | A few a week                                                                                                               | Notices and alerts retried hourly (src/server/email.ts); newsletter confirmations refused (logged)            | Brevo free plan per review sites (Brevo's own page not found), 2026-10-08                                       |
| Cloudflare Access (planned moderation)                                      | 50 users                                                                                                  | Not used yet                                                                                                               |                                                                                                               | Cloudflare announcement and reviews, 2026-10-08                                                                 |
| Umami Cloud (visitor statistics)                                            | 100,000 events a month (a page view or event, plus one per saved property); 1 website; data kept 6 months | Counts only on mikraot.net, so nothing before the cutover                                                                  | Not stated for the free plan; check the dashboard                                                             | [Umami pricing](https://umami.is/pricing), 2026-10-12                                                           |
| Sentry (error tracking)                                                     | 5,000 errors a month; 1 user; kept 30 days                                                                | Errors of the deployed site only (none from local runs, tests or previews); see below the table                            | Further errors that month are dropped; the Worker logs and the owner alert emails still work                  | [Sentry pricing](https://sentry.io/pricing/), 2026-10-12                                                        |
| Argos (screenshot comparisons)                                              | 5,000 screenshots a month (Hobby plan, for personal GitHub repositories; failed builds don't count)       | 10 per CI run, about 2,300 a month                                                                                         | Uploads stop until the month renews; the check then shows no comparison (the tests still pass)                | [Argos pricing](https://argos-ci.com/pricing), 2026-10-13                                                       |

Sentry's error quota is protected (set 2026-10-19 in Sentry's dashboard): events are accepted only
from mikraot.net and the workers.dev address (Allowed Domains; server events carry no Origin and
are unaffected), at most 60 an hour (the client key's rate limit), with Sentry's Spike Protection
on. The DSN is public in every page, so without these anyone could use up the month.

Zone protections for mikraot.net (set at the switch, 2026-10-21, with Arye's approval):

- **Rate-limiting rule** "Flood guard" (Security → WAF → Rate limiting rules; the free plan's one
  rule): more than 1,000 requests in 10 seconds from one address (per Cloudflare data centre) is
  blocked for 10 seconds. First set at 300; raised the same day because the live-site tests (four
  workers from one GitHub machine) tripped it, and mobile carriers and schools put many visitors
  behind one address. The link check runs 10 requests at a time for the same reason.
- **Bot Fight Mode off.** It challenged every request from a data centre, which blocked Brevo's
  newsletter webhook, RSS readers and the live-site tests, and the free plan allows no exceptions
  to it. The forms keep Turnstile and their own rate limits; Browser Integrity Check stays on.
- **Browser Cache TTL: "Respect Existing Headers"**, so browsers follow the site's own
  `cache-control` (pages: `max-age=0`) instead of keeping pages 4 hours.
- **Cloudflare Web Analytics** must stay off for mikraot.net (Umami counts visits): its injected
  script breaks the CSP, logs two errors on every page view and reports them to Sentry.

Assumptions to watch:

- **The backup outgrows 10 ms of CPU before 25 MiB.** Reading and serialising the tables takes CPU;
  at 45 KB it's negligible, but if the database passes about 1 MB (accounts and progress for many
  learners), check the scheduled run's CPU time in the logs, and split the backup per table.
- **Comments are rare** (the last one on WordPress was in 2023), so an hour between error emails
  and a daily backup are enough. Revisit if comments become daily.
- **Some failures can't send an email:** a scheduled run that never starts (there is no error to
  report), and a Worker stopped by Cloudflare itself (out of CPU time or memory, or the daily
  request limit reached), which ends before our code can react. UptimeRobot catches the site being
  down, but not the daily limit: the pages it checks are static and keep working, only comments
  and other Worker routes fail. The daily check from outside catches the rest (since 2026-10-13,
  `.github/workflows/daily-check.yml`, 06:30 UTC): it fails, and GitHub emails Arye, when the
  morning's backup is missing from KV, or when all Workers' requests the day before (UTC) reached
  80% of the free 100,000: a trend warning, since the limit resets daily and today's flood shows
  only tomorrow. It uses its own read-only token (GitHub secret `CF_MONITOR_API_TOKEN`: Workers KV
  Storage and Account Analytics, read; with `CF_ACCOUNT_ID`), not the configuration token; if
  that token expires, the check fails loudly. GitHub emails a failed scheduled run to whoever last
  changed the schedule (Arye's account), if his Actions notifications are on. GitHub also pauses
  scheduled workflows after 60 days without activity in a public repository, without an email
  (Renovate's merges normally prevent that): re-enable it under Actions → Daily check.
- **One script can use up the free daily requests:** each comment load, API call and unknown
  address runs the Worker, and 100,000 a day is about 70 a minute. A per-visitor limit inside the
  Worker can't prevent it (blocked requests still count), so after the switch a Cloudflare rate
  limiting rule (one is free) should block floods before the Worker runs: `docs/CUTOVER.md`,
  section 3.
- **One Cloudflare account holds the site, its database and its backups.** Losing the account
  loses all three; an off-Cloudflare copy (e.g. a monthly export kept by Arye) would cover that.

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

1. Read the Worker logs: Cloudflare dashboard → Workers → mikraot → Observability → Logs, around
   the time in the email ("POST /api/comments failed", "Browser error:", the backup's error).
2. If a deploy caused it: roll back (below), then fix through a pull request.
3. If D1 or KV is failing on Cloudflare's side: <https://www.cloudflarestatus.com>. Nothing to do
   but wait; the static pages keep working, only comments are affected.

### UptimeRobot: the site is down

UptimeRobot (Arye's account) checks `https://mikraot.net/` every 5 minutes and emails Arye.

1. Open the site; check <https://www.cloudflarestatus.com>.
2. If the last deploy broke it: roll back (below).

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

Afterwards: check the comments on a page, then delete the files in `.backups/`. Tested 2026-10-08:
locally (`--local`), comments wiped and restored with the same rows and reply links; the Time
Travel plan against production (read-only).

### Before they expire

- `CF_CONFIG_API_TOKEN` (the scoped Cloudflare token in `.env`): expires **2027-01-31**. Arye
  creates a new one with the same permissions (CLAUDE.md, Secrets policy) before then.
- `security.txt` expires 330 days after the build (`src/lib/security-txt.ts`); every deploy renews
  it, so it only lapses if nothing is deployed for 11 months.

## Limits and assumptions

The site runs on free plans. "What happens" is what a visitor or Arye would see when the limit is
reached.

| What                                    | Limit (free)                                        | We use (2026-10-08)                         | What happens at the limit                       | Source, checked                                                                                               |
| --------------------------------------- | --------------------------------------------------- | ------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Worker requests                         | 100,000 a day; static pages don't count             | API, comments feed, unknown addresses (404) | Those fail until 00:00 UTC; pages keep working  | [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), 2026-10-08                      |
| Worker CPU time                         | 10 ms per request and per scheduled run             | Small API calls; backup of 45 KB            | Error 1102 for that request or run              | Workers limits, 2026-10-08                                                                                    |
| Cron triggers                           | 5 per account                                       | 1 (daily backup)                            | No more schedules can be added                  | Workers limits, 2026-10-08                                                                                    |
| Workers Logs                            | Kept 3 days; 200,000 events a day                   | A few hundred lines a day                   | Older logs are gone; read them promptly         | [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/), 2026-10-08        |
| D1 storage                              | 500 MB per database (5 GB per account)              | 45 KB                                       | New comments can't be saved                     | [D1 limits](https://developers.cloudflare.com/d1/platform/limits/), 2026-10-08                                |
| D1 rows                                 | 5 million read, 100,000 written a day               | ~3,500 read a day                           | Comments stop loading until 00:00 UTC           | D1 pricing, 2026-10-08                                                                                        |
| D1 history (Time Travel)                | 7 days                                              |                                             | Older states need the KV backup                 | [Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), 2026-10-08                        |
| KV storage                              | 1 GB; 1,000 writes and 100,000 reads a day          | ~16 MB a year of backups; ~2 writes a day   | Backups or alert throttling fail                | [KV pricing](https://developers.cloudflare.com/kv/platform/pricing/), 2026-10-08                              |
| KV value size                           | 25 MiB                                              | 45 KB per backup                            | The backup fails (error email)                  | KV limits, 2026-10-08                                                                                         |
| Analytics Engine (searches not found)   | 100,000 writes, 10,000 queries a day; 3 months kept | A few a day                                 | Reports dropped; older data gone after 3 months | [Analytics Engine pricing](https://developers.cloudflare.com/analytics/analytics-engine/pricing/), 2026-10-08 |
| Brevo (comment notices and error mails) | 300 emails a day                                    | A few a week                                | Notices not sent (logged)                       | Brevo free plan per review sites (Brevo's own page not found), 2026-10-08                                     |
| Cloudflare Access (planned moderation)  | 50 users                                            | Not used yet                                |                                                 | Cloudflare announcement and reviews, 2026-10-08                                                               |

Assumptions to watch:

- **The backup outgrows 10 ms of CPU before 25 MiB.** Reading and serialising the tables takes CPU;
  at 45 KB it's negligible, but if the database passes about 1 MB (accounts and progress for many
  learners), check the scheduled run's CPU time in the logs, and split the backup per table.
- **Comments are rare** (the last one on WordPress was in 2023), so an hour between error emails
  and a daily backup are enough. Revisit if comments become daily.
- **A scheduled run that never starts sends no email** (there is no error to report). A daily
  check from outside would catch it: `docs/RECOMMENDATIONS.md`, Monitoring.
- **One Cloudflare account holds the site, its database and its backups.** Losing the account
  loses all three; an off-Cloudflare copy (e.g. a monthly export kept by Arye) would cover that.

# WordPress plugins: feature parity

Every active plugin on the live site (27, plus WordPress core and the Kahuna theme), each **feature**
it provides, whether the live site actually uses it, and what provides it in the new site. Checked
2026-10-03 from the plugin settings (WP-CLI, read-only) and the live pages' HTML.

Status: ✅ in the new site · ⬜ to do (task in `docs/ROADMAP.md`) · ❓ needs Arye's decision ·
➖ not needed (reason given).

## Comments (WordPress core, Akismet, Jetpack)

| Feature                                                              | Live                       | New site                                                                         |
| -------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| Comment form: name and email required, comment published immediately | yes                        | ✅                                                                               |
| Website (URL) field                                                  | yes                        | ➖ dropped: mostly used by spammers                                              |
| Spam filtering (Akismet: 2,504 caught)                               | yes                        | ✅ Turnstile, rate limit, honeypot                                               |
| **Email to Arye on every new comment** (core `comments_notify`)      | yes                        | ⬜ needs email sending from the Worker                                           |
| **Replies to a specific comment** (threaded, 5 levels)               | yes (1 admin reply so far) | ⬜ new site shows a flat list with an admin badge; no "reply" button             |
| "Remember my name and email" checkbox (cookie)                       | yes                        | ⬜ remember in the browser (localStorage), opt-in                                |
| "Notify me of follow-up comments by email" (Jetpack)                 | yes, on posts              | ⬜ reply notifications (needs email sending)                                     |
| "Notify me of new posts by email" (Jetpack Subscriptions)            | yes, on posts              | ❓ part of the newsletter decision; check WordPress.com for existing subscribers |
| Gravatar avatars                                                     | yes                        | ➖ replaced by plain icons (no third-party requests, better privacy)             |
| Pingbacks / trackbacks                                               | open, none ever received   | ➖                                                                               |
| Old comment links `#comment-<id>`                                    | yes                        | ✅                                                                               |
| Moderation (approve, delete, edit, reply as admin)                   | WordPress admin            | ⬜ moderation page behind Cloudflare Access (today: database commands only)      |

## Newsletter (Email Subscribers, Jetpack Subscriptions) ❓

Decision pending (own form + Cloudflare email recommended). Whatever is chosen must cover:

| Feature                                                                               | Live                       |
| ------------------------------------------------------------------------------------- | -------------------------- |
| Sign-up form "הרשמה" in the sidebar (name, email)                                     | yes                        |
| Double opt-in (confirmation email)                                                    | yes                        |
| Welcome email                                                                         | yes                        |
| Email to Arye on each new subscriber                                                  | yes                        |
| Automatic "new post" email to subscribers                                             | yes (campaign active)      |
| Newsletters written by hand                                                           | 1 sent                     |
| Unsubscribe link and page                                                             | yes                        |
| Blocked sign-up domains (`mail.ru`), sender name "מקראות"                             | yes                        |
| Open tracking                                                                         | on (➖ drop: privacy)      |
| Subscribers: 6 confirmed, 16 unconfirmed (+ any Jetpack subscribers on WordPress.com) | to import (confirmed only) |

## SEO (All in One SEO)

| Feature                                                                              | Live             | New site                                            |
| ------------------------------------------------------------------------------------ | ---------------- | --------------------------------------------------- |
| Page titles and meta descriptions                                                    | yes              | ✅ (identical, from frontmatter)                    |
| XML sitemap                                                                          | yes              | ✅ (`/sitemap.xml` → `/sitemap-index.xml`)          |
| Images listed in the sitemap                                                         | yes              | ⬜ minor: add image entries                         |
| RSS sitemap `/sitemap.rss`                                                           | yes              | ✅                                                  |
| HTML sitemap                                                                         | enabled, but 404 | ➖                                                  |
| Open Graph tags (Facebook, WhatsApp previews)                                        | yes              | ✅                                                  |
| Twitter card with title and description                                              | yes              | ⬜ only `twitter:card` today; add title/description |
| **Structured data (JSON-LD):** WebSite, WebPage, BreadcrumbList, BlogPosting, Person | yes              | ⬜ none yet                                         |
| Canonical URLs                                                                       | yes              | ✅                                                  |
| Author archive noindex; date archives indexed                                        | yes              | ✅                                                  |
| robots.txt                                                                           | default          | ✅                                                  |
| Text added after each item in RSS ("appeared first on…")                             | yes              | ➖ minor; not worth copying                         |
| Search-engine verification codes                                                     | none set         | ➖ (Search Console via DNS when set up)             |
| Redirects module                                                                     | not used         | ➖ (`public/_redirects` when needed)                |

## Statistics and monitoring (MonsterInsights, Jetpack Stats, Jetpack Monitor) ❓

| Feature                                                   | Live                 | New site                                              |
| --------------------------------------------------------- | -------------------- | ----------------------------------------------------- |
| Page views, visitors, referrers, countries                | GA4 + Jetpack Stats  | ❓ Cloudflare Web Analytics (cookie-free) recommended |
| Demographics (age, gender)                                | on (GA)              | ➖ needs Google's ad tracking and a consent banner    |
| Outbound-link and file-download clicks                    | on (GA events)       | ⬜ optional: own events via Workers Analytics Engine  |
| Email summaries of statistics                             | on (MonsterInsights) | ⬜ optional: monthly summary email                    |
| Historical GA data                                        | yes                  | ❓ export before cutover if wanted                    |
| **Uptime monitoring with email alerts** (Jetpack Monitor) | on                   | ⬜ free uptime check with email                       |

## Content display (Collapse-O-Matic, Show/Hide, Compact Audio Player, Elementor, EmbedPress, TablePress)

| Feature                                             | Live                            | New site                                                                                                                                               |
| --------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hidden explanations / answers (inline and block)    | yes                             | ✅                                                                                                                                                     |
| Show/hide animation                                 | yes                             | ✅ (simple transition)                                                                                                                                 |
| Audio buttons; only one recording plays at a time   | yes                             | ✅                                                                                                                                                     |
| Elementor-built pages (3 published + 1 draft)       | yes                             | ✅ converted and compared; ⬜ the draft "משמעות הטעמים" has more content in Elementor's data than in the page text: check it when finishing that draft |
| Embeds: YouTube                                     | yes                             | ✅                                                                                                                                                     |
| Embeds: PDF, Google Docs/Sheets/Slides/Maps, Vimeo… | enabled, unused                 | ➖ a content tag is added when first needed                                                                                                            |
| Tables                                              | core tables (TablePress unused) | ✅                                                                                                                                                     |
| Image lazy loading                                  | yes                             | ⬜ minor: `loading="lazy"` on content images                                                                                                           |
| Image CDN (Jetpack Photon)                          | yes                             | ✅ Cloudflare                                                                                                                                          |

## Posts and navigation (theme Kahuna, Jetpack)

| Feature                                              | Live                  | New site                                                  |
| ---------------------------------------------------- | --------------------- | --------------------------------------------------------- |
| Header banner, breadcrumbs, sticky menu, mobile menu | yes                   | ✅                                                        |
| Search box                                           | yes                   | ✅ (Pagefind; `/?s=` links work)                          |
| Post byline: author, category, date                  | yes                   | ✅                                                        |
| Month, category, author archives; RSS feeds          | yes                   | ✅                                                        |
| Footer menu, back-to-top                             | yes                   | ✅                                                        |
| **Previous/next post links** under a post            | yes                   | ⬜                                                        |
| **Related posts** ("קשור", Jetpack)                  | yes, on posts         | ⬜ same-category posts (useful once there are more posts) |
| Sharing buttons (Jetpack)                            | configured, not shown | ➖                                                        |

## Accounts (WordPress registration, BuddyPress, GamiPress, Nextend Social Login) ❓

| Feature                                                       | Live                                                                | New site                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| Registration and login links                                  | shown, but the BuddyPress register page is **404 on the live site** | ❓ drop now; accounts come with the courses          |
| Member profiles, activity stream, notifications, settings     | 4 users, 4 activity entries                                         | ❓ drop; `/חברים/`, `/פעילות/` already redirect home |
| Points "נעימה" (GamiPress, + YouTube/LearnPress integrations) | configured, no points ever awarded                                  | ❓ drop                                              |
| Facebook login (Nextend)                                      | 2 accounts linked                                                   | ❓ drop                                              |

## Security (Wordfence, Loginizer, Jetpack Protect / Account protection)

These protect the WordPress login and PHP code, which don't exist in the new site. The equivalent
protection for what does exist:

| Feature                                | Live            | New site                                                   |
| -------------------------------------- | --------------- | ---------------------------------------------------------- |
| Web firewall, blocking bad requests    | yes (Wordfence) | ✅ Cloudflare DDoS protection; ⬜ WAF managed rules        |
| Login brute-force lockout              | yes             | ➖ no public login; editor via GitHub login                |
| Two-factor login                       | 1 user          | ⬜ 2FA on GitHub, Cloudflare, GoDaddy                      |
| Malware and file-change scans          | yes             | ➖ no server code; ✅ dependency and secret scanning in CI |
| Email alerts on admin login and blocks | yes             | ⬜ turn on login alerts in GitHub and Cloudflare           |
| Strong passwords enforced              | yes             | ➖ (no site accounts)                                      |

## Site maintenance (WP-Optimize, Bluehost plugin, Endurance cache, FileBird, Broken Link Checker)

| Feature                                                                      | Live      | New site                                                             |
| ---------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------- |
| Minified HTML, CSS, JS                                                       | yes       | ✅ Astro build                                                       |
| Page cache                                                                   | off       | ✅ static pages on Cloudflare                                        |
| Database clean-up                                                            | available | ➖                                                                   |
| Automatic updates (WordPress, plugins, themes)                               | on        | ⬜ Renovate (dependency updates as reviewed pull requests)           |
| Staging copy                                                                 | yes       | ⬜ preview URL per change                                            |
| Media folders (FileBird, 2 folders)                                          | yes       | ✅ folders in the repo                                               |
| **Broken links: checked every 72 h, email report** (158 links, 1 broken now) | yes       | ⬜ internal links on every build + weekly external check with report |

## Not used at all on the live site

OptinMonster (never connected, 0 campaigns), WPForms (0 forms), Jetpack contact form (0 forms),
EmbedPress (0 uses), TablePress (0 tables), LiteSpeed Cache (inactive), Jetpack Blaze, AI, Notes,
JSON API, Enhanced Distribution, Tiled Gallery, WooCommerce Analytics, WordPress.com SSO: ➖.

LearnPress (courses, lessons, quizzes) and its GamiPress integration: deferred with the courses.

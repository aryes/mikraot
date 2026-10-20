# Recommendations

Ideas on top of the migrated site, by Claude. Nothing here is decided or scheduled: items move to
`docs/ROADMAP.md` (or straight into work) once Arye picks them. Updated in spare time between tasks;
last full review 2026-10-19 (eight independent reviewers, then a synthesis; below), earlier
2026-10-08.

Priority: **H** high value for the effort, **M** worth doing, **L** nice to have.
Effort: S (hours), M (days), L (weeks).
Each open item says what it needs from Arye: **decision** (a yes/no or a choice), **content** (his
writing or recordings), or **nothing** (Claude can do it once picked).

## Direction (Arye, 2026-10-03)

- **Audience: everyone:** adult beginners, bar/bat-mitzvah learners, synagogue readers and teachers.
- **Goal: impact, not income.** Success = people actually learning to read; reach matters as a means.
- **Time: about 4 hours a week** for content.

What follows from that:

1. **Spend development time on things that multiply Arye's 4 hours**, not on things that consume
   them. Building is cheap (Claude); Arye's content time is the scarce resource. Favour tools that
   turn one recording or one rule into many uses (exercises from marked-up examples, a trope chart
   fed by the same audio files, read-along from existing recordings).
2. **One site, several doors.** A "what do you want to do?" entry on the home page: learn to read
   pointed text / learn the טעמים / prepare a portion / teach. Each door is a short ordered path
   through the existing lessons (no new content needed).
3. **Impact needs measurement.** Without accounts: lessons completed (browser-side progress),
   exercises solved, audio played, searches without results, returning visitors. Pick 3–4 numbers
   and review them monthly.
4. **Impact grows through others:** an open licence, printable material and a "for teachers" page
   let teachers and synagogues multiply the reach. No income goal means no paywalls, no ads, no
   tracking: the site can promise that publicly.
5. **Large content projects** (a new נוסח, Haftarah, Megillot) don't fit 4 hours a week alone:
   spread them over months as a visible "in progress" series, or invite volunteer readers to
   record (a simple upload flow, Arye reviews).
6. **Content time, a suggested weekly rhythm:** ~2 h recording audio for one existing page, ~1 h
   writing or finishing one lesson section, ~1 h answering comments and reviewing the numbers.

## Review of 2026-10-19

Eight context-free reviewers (performance, security, content, styling, code quality, outside
tools, UX, site management) each reviewed the site and code, then each other's findings, and a
synthesis merged them. Done the same day: see "Done" below. Arye decided: no daily cap on
newsletter sign-ups (WordPress had none); one error message for every sign-up failure; the
comment management link doesn't expire; קניתָּ and "לפני שווא נח" stay as they are; two-factor
login postponed (still open in the roadmap).

Open from it, each waiting for Arye:

- **Needs: decision, every page looks different.** Phone menu: 16/15 px
  text, 44 px rows, and anchors not hidden under the sticky header (`scroll-padding-top`).
  Audio buttons: a "loading" state at once on tap. Subsetting the fallback and logo fonts (never
  Taamey David CLM). Wider phone text (edge-to-edge cards) and breadcrumbs that match the menu.
- **Decided (Arye, 2026-10-20): after the switch.** "Next / previous lesson" links and "you are here"
  in the menu, with each lesson's next chosen by hand, since not every lesson leads to the one after
  it in the menu.
- **Decided (Arye, 2026-10-20): after the switch.** The front page's three topics as cards plus the
  recordings, with an audience line Arye writes.
- **Decided (Arye, 2026-10-20): after the switch, once real commenters show what comes in.** Holding
  comments that contain links for approval (spam, not security: comments are always shown as escaped
  text, and the CSP blocks injected scripts).
- **Decided (Arye, 2026-10-20): after the switch.** A monthly off-Cloudflare copy of the backup to a
  private GitHub repository (the privacy policy gets a line).
- **Decided (Arye, 2026-10-20): no.** Alerts keep going to admin@mikraot.net, which stays the
  address for everything (the email move changes only where its mailbox is hosted).
- **Decided (Arye, 2026-10-20): not now; revisit after the switch.** A free Healthchecks.io account
  to catch GitHub's scheduled runs stopping (UptimeRobot's free plan has no heartbeat monitors; the
  daily check already watches the backup, so only the check itself is unwatched, and GitHub pauses
  it only after 60 days without activity).
- **Decided (Arye, 2026-10-20): yes.** Branch previews stay public after the switch (test database,
  no emails, the human check's test keys; locking them needs Cloudflare Zero Trust with a card on
  file). CLAUDE.md shortened to rules and a map after the switch (Claude's own working file).
- **Decided and done (Arye, 2026-10-20).** A content licence: CC BY-NC-SA 4.0, in the footer and on the about page (how to credit; not YouTube videos; the recordings, all Arye's, included).
- **Needs: decision.** A GitHub successor and a second Cloudflare member;
  pinning GitHub Actions by full SHA as a repository rule; no longer auto-merging the weekly
  lockfile refresh.
- **Needs: content (Arye).** The content review's reading of: דגש חזק's promise to tell it from
  דגש קל; "א = a" on מבטא; a stray bold "י" and two unlabelled Aramaic passages on תנועות; the
  אזלא name in the שלישים list; one line on יְהֹוָה and יְהוָה; the ketiv/qere אשדת on שווא נע;
  exercise 2 on שווא נע (after וּ and a געיה); on דגש קל, רבּוֹתָּי → רַבּוֹתַי, and "ןָ" in the
  list with קניתָּ (a typo for נָ?). Recordings for "read this" pages; new short lessons
  (קרי וכתיב, פתח גנובה, מלעיל/מלרע, ברכות התורה); verse references on practice passages; one
  update line in "מה חדש" at the switch.
- **Checked and not done:** raising Lighthouse's performance floor to 0.85 (CI's medians are
  lower: the post page measures 82); `--follow` for last-changed dates (not worth the code for a
  rare rename); loading Sentry only on the first error (saves bytes, but loses reports before it);
  R2 for the recordings (2 MB in all).

## Decisions of 2026-10-09

Arye went through most open items one by one; the few still marked "Needs: decision" weren't on
the list.

Approved (to build):

- **Comment moderation page** (behind Cloudflare Access) and **reply emails to commenters**: we
  keep our own comment system (see "Open questions").
- **Newsletter sign-up form.** Done (2026-10-12), as our own footer form on Brevo's double opt-in:
  Brevo's form editor has no right-to-left support.
- **Banner and brand:** a smaller banner on inner pages, with the banner's design rethought; a
  real logo and palette. Claude prepares 2–3 options for each. Banner and logo done (2026-10-11);
  the palette and a display font remain.
- **Dark mode.** Done (2026-10-11).
- **A daily outside check** (a backup that never ran, traffic near the free limit). Done
  (2026-10-13), with its own read-only token rather than the configuration token.
- **Hebrew fixes contributed to Keystatic** (a public pull request), so the local patch can go.
- **Umami Cloud** (free up to 100,000 events a month; company-backed, ~39,000 GitHub stars,
  checked 2026-10-09) to count audio and video plays, hidden answers opened and 404s, instead of
  building our own counter. Done (2026-10-12): it also replaces Cloudflare Web Analytics.
- **Faster automatic checks without lowering coverage** (Lighthouse stays at 3 runs a page). Done
  (2026-10-13).
- Done: the 3 security alerts with no fix were dismissed on GitHub as tolerable risk.

Open questions, for later:

- **Knowledge base or course?** Today the site is a knowledge base; a course will come "for sure".
  Several skipped ideas (learning paths, a landing home page, exercises, a lesson template) may
  come back with it.
- **Our own comment system vs. a ready-made one** (Hyvor Talk, about €12 a month, the only fit):
  kept ours while comments are rare; revisit if they become frequent.
- **The email field's wording** in the comment form: it is optional already; Arye will phrase it.
- **Worksheets:** Arye has Google Docs for many lessons; how to link them (e.g. a "דף עבודה"
  button per lesson).
- **Recording helper:** Arye records (Audacity, a good microphone); Claude trims, evens the volume,
  reduces noise, converts and places the files. Agreed in principle, later.
- **Read-along** (skipped for now): <https://www.ben13.co.il/> has it; look at how before building.
- **Content licence:** CC BY-NC-SA 4.0, chosen 2026-10-20 (in the footer).

Skipped for now: previous/next links, self-check exercises, the landing home page, the teaching
audio player and read-along (good ideas), the verse practice view, the weekly parasha box (not
enough recordings yet), "was this helpful?", community outreach (more involvement than there is
time for).

## What's next (suggested order)

After the cutover (`docs/CUTOVER.md`), in this order:

1. **H/S Read the numbers for a month:** visits and events (Umami, from the switch), Google
   searches (Search Console), and the site searches that found nothing (Claude lists them with
   `npm run search:misses`). Then decide what to build. Needs: nothing until then.
2. **H/M Learning paths:** a "where to start" page per door (see Direction 2), previous/next links
   between lessons in menu order (posts have them; lessons don't), a table of contents on long
   pages (שווא נע: about 1,000 words and 40 hidden answers). Skipped for now (2026-10-09).
   A draft of the doors, using only existing lessons (for Arye to change):
   - **לקרוא טקסט מנוקד:** מבטא → תנועות, עיצורים וניקוד → דגש קל → מפיק → דגש חזק → שווא נע →
     מתג → קמץ קטן → אותיות נחות → דבקים → הגיית שם יהוה; then the grammar lessons (אותיות השימוש
     and its three sub-lessons, סמיכות). The menu's order, with מתג moved in before קמץ קטן, whose
     rules use it. (דגש קל and שווא נע each rely on the other, so either may come first.)
   - **ללמוד את הטעמים:** תפקידי הטעמים → מיקום הטעמים → שיר הטעמים (in one's נוסח) → שיטת "גלגלי
     עזר" → the four "פסוקים לפי טעם" pages → טעמים ומילים → טעמים דומים → מדרג הטעמים → טעמים
     נדירים.
   - **להתכונן לקריאה בציבור** (for someone who already reads pointed text): שיר הטעמים → שיטת
     "גלגלי עזר" → פסוקים לפי טעם → the recorded readings in one's נוסח → the points that change
     how a word is read: דגש קל, דגש חזק, שווא נע, קמץ קטן, דבקים, הגיית שם יהוה, מש״ה מוציא
     וכל״ב מכניס, ה׳ הידיעה וה׳ השאלה.
   - **ללמד:** a short page on the print layout (closed answers make a worksheet), the three paths
     above as a syllabus, and an invitation to write in with questions.
3. **H/M Self-check exercises** at the end of lessons, generated from the hidden answers already
   written: 189 of them (שווא נע 40, אותיות נחות 40, ו׳ החיבור 28, קמץ קטן 24, מדרג הטעמים 13, and
   22 on each trope-song page). Each is a word plus "the answer – the reason" (השמטה → "הש׳ בשווא נע
   בגלל הדגש"; ויאמר → "זרקא"), so the site can ask "in השמטה, is the shva under ש נע or נח?" with
   the choices taken from that page's answers, then show the full explanation. Progress kept in the
   browser. Skipped for now (2026-10-09).
4. **H/M A trope chart page:** every טעם with symbol, name, example and audio per נוסח; probably the
   most searched topic. Needs: content (recordings).
5. **H/M Recordings where they're missing:** 45 recordings sit on just three pages (מבטא 28, דגש קל
   12, תנועות 5). None on the grammar lessons (שווא נע, קמץ קטן, אותיות נחות, מפיק, דגש חזק) or on
   the trope practice pages (אתנחתא וסוף פסוק, פשטא זקף קטן, רביעי דרגא תביר, מגוון טעמים, טעמים
   נדירים), where a learner most needs to hear the verse. One page a week (Direction 6) covers them
   in two to three months. Needs: content.
6. **H/M An audio recording workflow for Arye:** record (Audacity, a good microphone), save, and the
   recording lands on the right page (Claude converts, names and places it). Recording is most of
   the content time (Direction 1 and 6), so making it easy multiplies the rest. Agreed in principle
   2026-10-09 (Audacity, Claude processes), later.
7. **H/M Comment moderation page** behind Cloudflare Access (free; login by Arye's email): hide,
   delete, reply as admin. Once the site is live, comments arrive weekly and today moderating means
   asking Claude. Approved 2026-10-09. Skipped for now (2026-10-13).

Approved 2026-10-09: reply emails to commenters (done), the newsletter sign-up form (done
2026-10-12).

## 1. UX and design

Rating today: **8/10** (was 6.5 on 2026-10-03, 7.5 on 2026-10-08): fast (Lighthouse 82–95 on
2026-10-07, the home page 96–97 after the font change of 2026-10-11),
accessible (axe and Lighthouse 98–100, contrast checked in dark mode too), prints well,
keyboard-friendly menus, a logo, one centred column. Every visual change now gets a design review
(`docs/DESIGN-REVIEW.md`). Less of a template, though the palette and the exercises still are.

- **H/M Learning flow:** see "What's next" 2. Also "you are here" in the menu. Skipped for now
  (2026-10-09).
- **M/M Home page as a landing page:** four cards (הגיה, דקדוק, טעמים, קריאות), a "start here"
  button, then the latest posts; today it is a text page. Skipped for now (2026-10-09).
- **M/M Brand:** a small palette from the brand green, one distinctive Hebrew display font for
  headings. Approved 2026-10-09 (the logo is done).
- **L/S** A one-page "how the marks look" reference (every טעם and vowel, enlarged; the rarest, like
  ירח בן יומו, render correctly in the site font). Doubles as a visual test. Needs: decision (a new
  public page).

## 2. Learning features

- **H/M Exercises:** see "What's next" 3: 5–10 short questions per lesson (שווא נע or נח? which
  טעם?), instant feedback, browser-side progress. Replaces LearnPress quizzes for most needs.
- **H/M Audio player that teaches:** speed control (0.75×), loop a phrase, a sound for every trope
  name (click "פשטא" → hear it), the same player on every page. Skipped for now (2026-10-09).
- **H/L Read-along ("karaoke") for recorded readings:** highlight each word while the recording
  plays; what paid trope trainers (and the free PocketTorah app) offer. The hard part is word
  timings per recording. Researched 2026-10-08: no ready-made tool for chanted Hebrew, so three
  options: (a) matching our known text to the audio automatically with ReadAlong Studio (open
  source, works for new languages without training; our text is fully pointed, which tells the tool
  how each word sounds, plus a few rules for shva, dagesh and qamats qatan); chanting may confuse
  it, so test first; (b) a speech-recognition tool with word times (WhisperX): weaker, since it
  writes its own unpointed transcript instead of following our text; (c) a tap-along tool: Arye
  plays a recording and taps once per word, about 1.5–2× the recording's length with corrections.
  Start with a one-day test of (a) on one recording, then decide. Skipped for now (2026-10-09);
  ben13.co.il has it, look there first.
- **M/M Glossary** with tap/hover definitions wherever a term appears, and a glossary page. Counted
  2026-10-08: terms like אתנחתא (8 pages), שווא נע, חטף, מקף (6 each), שווא נח (5), מפיק, מחבר (4)
  and מלעיל/מלרע recur across lessons; some have a lesson of their own, others only a passing line
  (חטף, מלעיל/מלרע) or nothing at all (הברה פתוחה). About 15 entries would cover them. Needs: content (short
  definitions; Claude can draft from the lessons).
- **M/M Text view of any verse or chapter** with toggles: letters only / + niqqud / + טעמים
  (tikkun-style practice). Source checked 2026-10-08: the current release of the common
  Westminster Leningrad Codex is licensed "no derivatives" (CC BY-NC-ND; older copies circulated
  as public domain), which leaves its use for a practice view unclear; _Miqra according to the
  Masorah_ (Aleppo Codex tradition, made for Jewish use, with documented טעמים, CC BY-SA, available
  through Sefaria) fits without that doubt, with attribution. Skipped for now (2026-10-09).
- **M/S Weekly parasha shortcut:** "this week's reading" linking to its recordings. Hebcal's
  reading-schedule library is free (BSD) but depends on a GPL-licensed core, so the clean way is to
  compute a year of weekly readings at build time into a small data file: no requests from
  visitors' browsers, no GPL code shipped. Skipped for now (2026-10-09): not enough recordings yet.
- **M/S Reply emails to commenters** (opt-in checkbox, unsubscribe link; reuses
  `src/server/notify.ts`). Approved 2026-10-09.
- **L/M Printable worksheets** (PDF) for teachers; the print layout already prints any lesson
  cleanly, closed answers making a worksheet. Open (2026-10-09): Arye has Google Docs worksheets to
  link.
- **Decide later:** accounts (only if progress must follow a learner between devices); an English
  edition (the bar/bat-mitzvah audience abroad is large).

## 3. Content

- **H/S Finish the drafts:** משמעות הטעמים, ניגון סוף עליה, טעמי אמ״ת, אתרים וכלים ללימוד. Needs:
  content.
- **H/S "Where to start"** page(s): see "What's next" 2.
- **H/S Weekly habit, two minutes:** when adding or improving content, add an "update" line in the
  editor. It appears in "מה חדש" and, once the newsletter is set up, goes to subscribers; without it
  new content stays invisible to returning learners. Needs: content (a habit).
- **M/M One template for lessons:** goal → rule → examples (with audio) → exceptions → exercises →
  summary. Makes the site feel like a course and gaps visible. Waits on "knowledge base or course?"
  (2026-10-09).
- **M/L More נוסחים:** Sephardi-Yerushalmi first (the largest Israeli audience), then Teimani.
  Needs: content (or volunteer readers).
- **M/M Haftarah and Megillot** trope (same symbols, different melodies). Needs: content.

## 4. Security and privacy

In place: CSP and security headers, Turnstile (loaded only when commenting or signing up), rate
limits per visitor network (and per address for newsletter sign-ups), error tracking (Sentry, no
personal data), honeypot, secret scanning (gitleaks, GitHub push protection), CAA records,
security.txt, required checks before any merge, dependency updates with tests.

- **H/S Two-factor login** on GitHub, Cloudflare and GoDaddy, plus login alerts (replaces
  Wordfence). Needs: Arye (his accounts).
- **H/S DNSSEC:** with the domain's move to Cloudflare Registrar after the cutover. Needs: Arye (the
  transfer is a purchase).
- **H/S Email authentication** when email moves off Bluehost: SPF, DKIM, DMARC tightened from
  `p=none` to `quarantine`, then `reject`, so nobody can send mail as @mikraot.net. Needs: decision
  (part of the email move).
- **M/S Privacy (amendment 13 of the Privacy Protection Law, in force since 14 August 2025; it
  counts IP addresses as personal data; checked 2026-10-08):** collect less: make the commenter's
  email clearly optional (it is; the wording is Arye's, 2026-10-09).
- **L/S** Browsers' built-in "HTTPS only" list (HSTS preload). It needs the rule to cover every
  subdomain (`includeSubDomains`) and a `preload` directive, and leaving the list takes months, so
  only after email has left Bluehost and every subdomain answers over HTTPS; today the header is a
  one-year HSTS without subdomains (checked 2026-10-08). Needs: decision. (Cloudflare's free managed
  firewall rules are already on: the zone audit found them, 2026-10-08.)

## 5. Running the site

- **H/M Editing in the browser:** Keystatic in GitHub mode, from any computer or phone: edits are
  saved as commits to a branch chosen in the editor (`main` only accepts pull requests), every
  branch gets its own preview site automatically, and opening and merging the pull request on
  GitHub publishes. Tested 2026-10-08 (a local build in Cloudflare's runtime, not deployed): the
  editor page loads, its sign-in route sends the browser to GitHub's sign-in, the callback checks
  its input, and the Worker grows to 415 KB compressed (far under Cloudflare's 64 MB limit).
  Untested until the app exists: the final exchange with GitHub (an ordinary request). To set up:
  a GitHub app (Keystatic's setup page creates it from Arye's account), its client ID, client
  secret and a session secret as Worker secrets plus its name at build time, and `/keystatic` kept
  out of search, the sitemap and the site search; only GitHub users who can write to the
  repository can edit. Needs: decision.
- **M/S Monitoring, the rest:** the site is watched from outside (UptimeRobot), server errors and
  failed backups email Arye at once (2026-10-08), and Sentry collects browser and server errors with
  their details (2026-10-12), and a daily check from outside (GitHub, 2026-10-13) fails when the
  morning's backup is missing or the Worker's requests near the free plan's 100,000 a day. Static
  pages don't count toward that limit; the API, the comments feed and every address with no page
  (404s, including bots probing old WordPress paths) do, so a bot wave is the likely way to reach
  it. Done.
- **M/S Faster automatic checks:** done 2026-10-13: the browser tests run in three parallel jobs
  and Lighthouse in four (one page each), with the same tests, runs and limits. Building the site
  once for all jobs wouldn't have helped: the jobs already build at the same time, and waiting for
  a shared build would only have added a step in front. (Kept from 2026-10-09: three Lighthouse
  runs per page; no caching of the test browser, which Playwright advises against.)
- **M/S Clean-up after the cutover:** the old `mikraot-api` Worker, `worker/`, `/staging/` on
  Bluehost, the Supabase project (after a final export). In `docs/CUTOVER.md` step 5. Needs: Arye's
  approval (deletions).
- **M/S Better Hebrew in Keystatic upstream:** contribute the corrected strings
  (`patches/@keystatic+core+0.6.9.patch`) and the hard-coded English labels to Keystatic, so the
  patch can go and every Hebrew user benefits. Approved 2026-10-09.

## 6. Learning what visitors need

Privacy-first, without cookies, so no consent banner:

- **M/S Bing Webmaster Tools** besides Google Search Console (a few minutes; DuckDuckGo and
  Copilot draw mainly on Bing's index, checked 2026-10-08; ChatGPT's web search partly).
  Needs: Arye (account).
- **Visits and content events** are counted by Umami (done 2026-10-12; cookieless, EU-hosted,
  counting from the switch): page views, referrers, devices, audio and video plays, hidden answers
  opened, 404s. Page speed as visitors experience it is the one thing Cloudflare Web Analytics
  measured that Umami doesn't; Lighthouse covers it in testing.
- **M/S "Was this page helpful?"** 👍/👎 with an optional comment. Skipped for now (2026-10-09).
- **Avoid** session recording (Hotjar, Clarity): needs a consent banner and records personal
  behaviour; not worth it at this size.

## 7. What comparable sites do

(From general knowledge; not a traffic study.)

- **Sefaria:** free, open-source library with an open API and licences; openness and linking bring
  reach and partners.
- **AlHatorah.org:** Mikraot Gedolot and study tools; deep and scholarly.
- **Mechon Mamre:** plain HTML, decades old, still heavily used: reliable text beats design.
- **Tikkun sites and apps (e.g. Tikkun.io):** text with and without vowels and trope side by side.
- **Trope Trainer and similar paid software:** audio for every verse, word highlighting, nusach
  choice: the demand for read-along practice.
- **YouTube parasha readings:** audio and video are how many people actually learn trope.
- **What the successful ones share:** audio for everything, a practice loop (hear → try → check),
  a clear goal (read my portion), free, works on a phone.
- **Mikraot's niche:** no other free Hebrew site explains _why_ (grammar rules, the hierarchy of
  טעמים) as clearly. Keep that, and add the practice loop around it.

## Also worth considering

- **Licence the content** so teachers can share it legally: CC BY-NC-SA 4.0, chosen 2026-10-20 (see
  "Review of 2026-10-19"). The recordings are Arye's and under it too (the about page says so).
- **Community:** reach teachers and synagogue gabbaim (they send learners); a WhatsApp channel or the
  newsletter for new lessons. Skipped for now (2026-10-09): more involvement than there is time for.

## Done (from these recommendations)

- 2026-10-03: reading typography (Taamey D for pointed text).
- 2026-10-04: the taught letter bold as well as orange (not colour alone); link checks (every internal link on each test run, outside links weekly); Renovate;
  privacy policy rewritten (publication date pending).
- 2026-10-05: a preview for every branch (Cloudflare builds each one; required before merging since
  2026-10-08); security.txt; print layout; HTML validation in the build; browser error reports; IPv6
  rate limits; counting searches that found nothing; Search Console; CAA records.
- 2026-10-07: testing the deployed site after each deploy; banner as AVIF/WebP; Lighthouse with
  minimum scores (it found and we fixed: address-less menu and footer links, the comments heading
  level, the human check loading with every page, labels on the comment form); short addresses for
  pointed page URLs.
- 2026-10-08: videos load only when played; home page heading levels; keyboard-friendly menus; share
  pictures per page; content checks; screenshot comparisons (local); Keystatic's Hebrew labels
  (patch) and Hebrew page addresses; the editing guide (`docs/GUIDE.md`); pull requests with
  required checks; faster tests (two workers, Lighthouse in parallel); daily database backups to
  Workers KV, kept a year (D1 alone restores only 7 days back on the free plan); the 4 missing links
  between lessons (the rest were already linked); error emails to Arye (server errors, failed
  backups); the 3 security alerts with no fix dismissed (tolerable risk, 2026-10-09); one-command
  restore (`db:restore`) and switch-day check (`cutover:check`); recovery procedures and limits in
  `docs/OPERATIONS.md`; a skip link and sound buttons named for what they play; short search
  descriptions, "title: description", on 33 pages. Dropped: content images as AVIF/WebP (the content
  has no pictures, and the banner already is; the 52 WordPress images serve only the site icon and
  old links); lessons marked as lessons for search engines (Google retired its course-info, learning
  video and practice-problem rich results in 2025-2026; the ones left, course lists and flashcard
  Q&A, are not offered in Hebrew).
- 2026-10-11: the logo (a yad, drawn with Arye) in the header, footer and browser tab, with the
  name pointed (מִקְרָא֑וֹת); inner pages get a compact title card (breadcrumbs, a small crop of the
  photo, the title) instead of the 250 px photo banner; the home page keeps it. Dark mode,
  following the system setting (printing stays light), with every page checked for contrast in it.
  One font for all Hebrew (Noto, with bold vowel and cantillation marks), instead of switching to
  Taamey D for pointed words; faster pages (Lighthouse 95-97).
- 2026-10-12: the design review as a standing step (`docs/DESIGN-REVIEW.md`); the sidebar gone
  (one centred column, archives and categories in the footer); the comment form closed until asked
  for, saying what is missing; bigger tap areas on phones; visitor statistics and events (Umami);
  error tracking (Sentry, replacing the browser error reports to the Worker logs); the newsletter
  sign-up in the footer (Brevo double opt-in, welcome email, a notice to Arye).
- 2026-10-14: Taamey David CLM for all text, replacing Noto, which misplaced rarer cantillation
  combinations (with a rebuilt bold that keeps the marks).
- 2026-10-13: newsletter open and click tracking stays on (Brevo's default), stated in the privacy
  policy only (Arye: a consent line in the form would drive subscribers away; the audience is
  Israeli, while France's regulator wants consent for open tracking since April 2026).
- 2026-10-19 (the review): recordings answered in pieces for iPhone Safari (range requests),
  cached a week; a "ניהול התגובה" link in each new-comment email that hides or restores the
  comment; refused emails retried hourly from a Cloudflare Queue; an actionable message when a
  sign-up email can't be sent; the switch-day guide merging the switch by hand; an "if Claude is
  unavailable" card in the guide; Sentry accepting reports only from the site, 60 an hour;
  security headers on the Worker's own answers; commenters' text kept as text in the comments
  feed; the human check bound to the site and the form, with a 5-second limit; the comment form's
  honest load failure, 16 px fields and 3:1 borders; search finding other spellings and
  prefix-less forms, with links when nothing is found; the search index cached a year; the
  recordings picker's choices in the address; the content import refusing to overwrite edits;
  answer buttons that say "פתרון" (32 px, a 44 px tap area, named for screen readers by the word they answer; approved by Arye 2026-10-20); gitleaks checked against its checksum and tool versions in workflow commands tracked by
  Renovate; content fixes (וְאַזְלָ֜א six times, "הי׳ והה׳").

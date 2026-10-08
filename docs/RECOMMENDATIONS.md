# Recommendations

Ideas on top of the migrated site, by Claude. Nothing here is decided or scheduled: items move to
`docs/ROADMAP.md` (or straight into work) once Arye picks them. Updated in spare time between tasks;
last full review 2026-10-08.

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

## What's next (suggested order)

After the cutover (`docs/CUTOVER.md`), in this order:

1. **H/S Read the numbers for a month:** visits (Cloudflare Web Analytics, from the switch), Google
   searches (Search Console), and the site searches that found nothing (Claude lists them with
   `npm run search:misses`). Then decide what to build. Needs: nothing until then.
2. **H/M Learning paths:** a "where to start" page per door (see Direction 2), previous/next links
   between lessons in menu order (posts have them; lessons don't), a table of contents on long
   pages (שווא נע: about 1,000 words and 40 hidden answers). Needs: decision (the orders), a little
   content.
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
   browser. Needs: decision; then Arye only reviews the generated questions.
4. **H/M A trope chart page:** every טעם with symbol, name, example and audio per נוסח; probably the
   most searched topic. Needs: content (recordings).
5. **H/M Recordings where they're missing:** 45 recordings sit on just three pages (מבטא 28, דגש קל
   12, תנועות 5). None on the grammar lessons (שווא נע, קמץ קטן, אותיות נחות, מפיק, דגש חזק) or on
   the trope practice pages (אתנחתא וסוף פסוק, פשטא זקף קטן, רביעי דרגא תביר, מגוון טעמים, טעמים
   נדירים), where a learner most needs to hear the verse. One page a week (Direction 6) covers them
   in two to three months. Needs: content.
6. **H/M An audio recording workflow for Arye:** record on the phone, send, and the recording lands
   on the right page (Claude converts, names and places it). Recording is most of the content time
   (Direction 1 and 6), so making it easy multiplies the rest. Needs: decision.
7. **H/M Comment moderation page** behind Cloudflare Access (free; login by Arye's email): hide,
   delete, reply as admin. Once the site is live, comments arrive weekly and today moderating means
   asking Claude. Needs: decision.

Waiting on Arye already: the search descriptions (`docs/SEO-DESCRIPTIONS.md`), reply emails to
commenters, the newsletter sign-up form.

## 1. UX and design

Rating today: **7.5/10** (was 6.5 on 2026-10-03): fast (Lighthouse 82–95), accessible (axe and
Lighthouse 98–100), prints well, keyboard-friendly menus. Still looks like a template.

- **H/M Learning flow:** see "What's next" 2. Also "you are here" in the menu. Needs: decision.
- **M/S Smaller banner on inner pages** (≈120 px): on a phone the 250 px photo pushes the lesson
  below the fold; keep the full banner on the home page. Needs: decision.
- **M/M Home page as a landing page:** four cards (הגיה, דקדוק, טעמים, קריאות), a "start here"
  button, then the latest posts; today it is a text page. Needs: decision.
- **M/M Brand:** a real logo (the book icon is a placeholder), a small palette from the brand green,
  one distinctive Hebrew display font for headings. Needs: decision (a designer, or Claude drafts).
- **L/M Dark mode** (following the system setting); check the teaching colours in both. Needs:
  decision.
- **L/S** A one-page "how the marks look" reference (every טעם and vowel, enlarged; the rarest, like
  ירח בן יומו, render correctly in Taamey D). Doubles as a visual test. Needs: decision (a new
  public page).

## 2. Learning features

- **H/M Exercises:** see "What's next" 3: 5–10 short questions per lesson (שווא נע or נח? which
  טעם?), instant feedback, browser-side progress. Replaces LearnPress quizzes for most needs.
- **H/M Audio player that teaches:** speed control (0.75×), loop a phrase, a sound for every trope
  name (click "פשטא" → hear it), the same player on every page. Needs: decision; recordings for the
  trope names.
- **H/L Read-along ("karaoke") for recorded readings:** highlight each word while the recording
  plays; what paid trope trainers (and the free PocketTorah app) offer. The hard part is word
  timings per recording. Researched 2026-10-08: no ready-made tool for chanted Hebrew, so three
  options: (a) matching our known text to the audio automatically with ReadAlong Studio (open
  source, works for new languages without training; our text is fully pointed, which tells the tool
  how each word sounds, plus a few rules for shva, dagesh and qamats qatan); chanting may confuse
  it, so test first; (b) a speech-recognition tool with word times (WhisperX): weaker, since it
  writes its own unpointed transcript instead of following our text; (c) a tap-along tool: Arye
  plays a recording and taps once per word, about 1.5–2× the recording's length with corrections.
  Start with a one-day test of (a) on one recording, then decide. Needs: decision.
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
  through Sefaria) fits without that doubt, with attribution. Needs: decision.
- **M/S Weekly parasha shortcut:** "this week's reading" linking to its recordings. Hebcal's
  reading-schedule library is free (BSD) but depends on a GPL-licensed core, so the clean way is to
  compute a year of weekly readings at build time into a small data file: no requests from
  visitors' browsers, no GPL code shipped. Needs: decision.
- **M/S Reply emails to commenters** (opt-in checkbox, unsubscribe link; reuses
  `src/server/notify.ts`). Needs: decision.
- **L/M Printable worksheets** (PDF) for teachers; the print layout already prints any lesson
  cleanly, closed answers making a worksheet. Needs: decision.
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
  summary. Makes the site feel like a course and gaps visible. Needs: decision.
- **M/S Internal links:** each lesson links to the related ones: the first mention of a term that
  has its own lesson (שווא נע, מפיק, דגש קל, קמץ קטן, מתג…) links to it. A cheap first step before
  the glossary. Needs: review (Claude proposes the links, Arye approves the changes to his lessons).
- **M/L More נוסחים:** Sephardi-Yerushalmi first (the largest Israeli audience), then Teimani.
  Needs: content (or volunteer readers).
- **M/M Haftarah and Megillot** trope (same symbols, different melodies). Needs: content.

## 4. Security and privacy

In place: CSP and security headers, Turnstile (loaded only when commenting), rate limits per
visitor network, honeypot, secret scanning (gitleaks, GitHub push protection), CAA records,
security.txt, required checks before any merge, dependency updates with tests.

- **H/S Two-factor login** on GitHub, Cloudflare and GoDaddy, plus login alerts (replaces
  Wordfence). Needs: Arye (his accounts).
- **H/S DNSSEC:** with the domain's move to Cloudflare Registrar after the cutover. Needs: Arye (the
  transfer is a purchase).
- **H/S Email authentication** when email moves off Bluehost: SPF, DKIM, DMARC tightened from
  `p=none` to `quarantine`, then `reject`, so nobody can send mail as @mikraot.net. Needs: decision
  (part of the email move).
- **M/S Backups of comments:** the database keeps 30 days of history; add a weekly export to
  Cloudflare's private file storage (R2, free at this size). Needs: decision.
- **M/S Privacy (amendment 13 of the Privacy Protection Law):** collect less: make the commenter's
  email clearly optional, or drop it unless reply emails are built. Needs: decision.
- **L/S** Browsers' built-in "HTTPS only" list (HSTS preload) once the site is stable; Cloudflare's
  free firewall rules against common attacks. Needs: decision.
- **S/S Dismiss the 3 security alerts that have no fix** (GitHub's Dependabot alerts, which already
  cover what a weekly `npm audit` would). Of the 7 open on 2026-10-08, 4 had fixed versions and are
  overridden in `package.json` (`overrides`). The other 3 (2 for `extract-zip`, 1 for
  `sprintf-js`) come from Lighthouse CI (`@lhci/cli`, no release since June 2025), which only we
  run (the automatic checks, `npm run lighthouse`) and only on our own pages: no outside input
  reaches them.
  Proposal: dismiss them on GitHub as "risk is tolerable", with that reason, so a new alert stands
  out. Needs: decision.

## 5. Running the site

- **H/M Editing in the browser:** Keystatic in GitHub mode: an edit becomes a pull request with a
  preview; approving publishes, no laptop needed. Needs: decision (a GitHub app for Keystatic).
- **M/S Monitoring:** an uptime check with email (UptimeRobot, in the cutover plan), plus a daily
  check of the Worker's own numbers. Cloudflare's error-rate alerts are Enterprise-only (checked
  2026-10-08), so the free way is a scheduled GitHub workflow that reads the Worker's requests and
  errors through Cloudflare's analytics API (the existing token can read them since 2026-10-05)
  and fails, emailing Arye, when errors exceed about 1% or requests near the free plan's 100,000 a
  day. Static pages don't count toward that limit (Cloudflare serves them free); the API (comments,
  searches counted, error reports), the comments feed and every address with no page (404s,
  including bots probing old WordPress paths) do, so a bot wave is the likely way to reach it.
  Needs: decision (the token would be stored as a GitHub secret).
- **M/S Faster automatic checks:** a run takes about 4 minutes (Lighthouse is the longest part);
  caching the test browser would save another ~30 s. Needs: nothing.
- **M/S Clean-up after the cutover:** the old `mikraot-api` Worker, `worker/`, `/staging/` on
  Bluehost, the Supabase project (after a final export). In `docs/CUTOVER.md` step 5. Needs: Arye's
  approval (deletions).
- **M/S Better Hebrew in Keystatic upstream:** contribute the corrected strings
  (`patches/@keystatic+core+0.6.9.patch`) and the hard-coded English labels to Keystatic, so the
  patch can go and every Hebrew user benefits. Needs: decision (a public contribution).

## 6. Learning what visitors need

Privacy-first, without cookies, so no consent banner:

- **H/S Cloudflare Web Analytics** at the switch (in the cutover plan): page views, referrers,
  devices, page speed as visitors experience it. Needs: Arye (switched on in the dashboard).
- **M/S Bing Webmaster Tools** besides Google Search Console (a few minutes; Bing also feeds
  DuckDuckGo). Needs: Arye (account).
- **M/S Content events** via Workers Analytics Engine (already used for searches): audio plays,
  video plays, hidden answers opened, 404s. Needs: decision.
- **M/S "Was this page helpful?"** 👍/👎 with an optional comment. Needs: decision.
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

- **Licence the content** (e.g. CC BY-NC-SA) so teachers can share it legally; state the rights in
  the recordings. Needs: decision.
- **Community:** reach teachers and synagogue gabbaim (they send learners); a WhatsApp channel or the
  newsletter for new lessons. Needs: decision.
- **Lessons marked as lessons for search engines** (structured data; breadcrumbs and posts already
  have it), which may earn richer search results. Needs: nothing.

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
- 2026-10-08: videos load only when played; home page heading levels; keyboard-friendly menus;
  share pictures per page; content checks; screenshot comparisons (local); Keystatic's Hebrew labels
  (patch) and Hebrew page addresses; the editing guide (`docs/GUIDE.md`); pull requests with
  required checks; faster tests (two workers, Lighthouse in parallel). Dropped: content images as
  AVIF/WebP (the content has no pictures, and the banner already is; the 52 WordPress images
  serve only the site icon and old links).

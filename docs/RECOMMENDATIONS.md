# Recommendations

Ideas on top of the migrated site, by Claude. Nothing here is decided or scheduled: items move to
`docs/ROADMAP.md` once Arye picks them. Updated in spare time between tasks.

Priority: **H** high value for the effort, **M** worth doing, **L** nice to have.
Effort: S (hours), M (days), L (weeks).

## Direction (Arye, 2026-10-03)

- **Audience: everyone:** adult beginners, bar/bat-mitzvah learners, synagogue readers and teachers.
- **Goal: impact, not income.** Success = people actually learning to read; reach matters as a means.
- **Time: about 4 hours a week** for content.

What follows from that:

1. **Spend development time on things that multiply Arye's 4 hours**, not on things that consume
   them. Building is cheap (Claude); Arye's content time is the scarce resource. Favour tools that
   turn one recording or one rule into many uses (exercises generated from marked-up examples, a
   trope chart fed by the same audio files, read-along from existing recordings).
2. **One site, several doors.** Rather than separate sections per audience, a "what do you want to
   do?" entry on the home page: learn to read pointed text / learn the טעמים / prepare a portion /
   teach. Each door is a short ordered path through the existing lessons (no new content needed).
3. **Impact needs measurement.** Without accounts, measure learning signals: lessons completed
   (browser-side progress), exercises solved, audio played, searches without results, returning
   visitors. Pick 3–4 numbers and review them monthly.
4. **Impact grows through others:** an open licence for the texts, printable material and a
   "for teachers" page let teachers and synagogues multiply the reach. No income goal means no
   paywalls, no ads, no tracking: the site can promise that publicly.
5. **Large content projects** (a new נוסח, Haftarah, Megillot) don't fit 4 hours a week alone:
   either spread them over months as a visible "in progress" series, or invite volunteer readers to
   record (with a simple upload flow and Arye's review).
6. **Suggested order of work:** measurement (S) → learning paths and prev/next (S/M) → reading
   typography (S) → exercises from existing hidden answers (M) → trope chart with audio (M) → audio
   recording workflow for Arye (M) → read-along (L).
7. **Content time, a suggested weekly rhythm:** ~2 h recording audio for one existing page, ~1 h
   writing or finishing one lesson section, ~1 h answering comments and reviewing the monthly
   numbers.

## Quick summary: top picks

1. **H/S** Search Console + Cloudflare Web Analytics, and log searches that found nothing: learn
   what visitors look for before building more.
2. **H/M** Audio wherever a reader must _hear_ something: grammar pages (שווא נע, קמץ קטן, אותיות
   נחות) have none today; a trope chart with every טעם sounded in each נוסח.
3. **H/M** Self-check exercises at the end of lessons (the "hidden answer" pattern already exists:
   83 collapsibles on שווא נע), with progress kept in the browser, no accounts.
4. **H/M** A clear learning path: "where to start" page, previous/next links on every lesson, table
   of contents on long pages.
5. **H/S** Rewrite the privacy policy before launch: it describes the WordPress plugins and cookies
   that are going away.
6. **M/L** A Sephardi (ירושלמי-ספרדי) נוסח: today only אשכנז and בבלי/עירקי, while a large share of
   Israeli readers read Sephardi.

## 1. UX, styling and design

Rating today: **6.5/10.** Clean, readable, accessible (WCAG AA audit passes), fast. But it looks
like a generic template, and the reading experience of pointed text (the heart of the site) is not
yet tuned.

- ✅ **H/S Reading typography for pointed text.** Biblical examples need a larger size than body text _(done 2026-10-03: Taamey D for pointed text, Noto Hebrew for the rest)_
  (about 1.35–1.5×), generous line height (≥ 1.9, so niqqud and טעמים don't collide), and a font
  that renders every טעם correctly. Test the current fonts against all cantillation marks
  (including rare ones: קרני פרה, ירח בן יומו, שלשלת); if any is missing, use a font made for it,
  e.g. Taamey Frank CLM or Ezra SIL, for biblical text only.
- **H/S Don't rely on colour alone** for the taught letter (WCAG 1.4.1): add a second cue (bold or
  underline) to the orange mark; this also softens the pending contrast decision.
- **H/M Learning flow:** previous/next lesson links at the bottom of each page (in menu order), a
  table of contents on long pages (שווא נע is ~1,950 words), "you are here" in the menu.
- **M/S Smaller banner on inner pages** (≈120 px): on a phone the 250 px photo pushes the lesson
  below the fold. Keep the full banner on the home page.
- **M/M Home page as a landing page:** four cards (הגיה, דקדוק, טעמים, קריאות) with one line each,
  a "start here" button, then the latest posts; today it is a text page.
- **M/M Brand:** a real logo (the book icon is a placeholder), a small consistent palette built from
  the brand green, one distinctive Hebrew display font for headings.
- **M/S Print stylesheet:** teachers print lessons; hide navigation, comments and sidebar, keep
  colours, show link URLs.
- **L/M Dark mode** (respecting the system setting); check the teaching colours in both.

## 2. Features

- **H/M Audio player that teaches:** speed control (0.75×), loop a phrase, a sound for every trope
  name (click "פשטא" → hear it), consistent player on every page.
- **H/L Read-along ("karaoke") for recorded readings:** highlight each word while the recording
  plays. The single most useful tool for trope practice (what paid trope trainers sell). Needs word
  timings per recording: start with a few readings, timed by hand or semi-automatically.
- **H/M Exercises:** per lesson, 5–10 short questions (is this שווא נע or נח? which טעם is this?)
  with instant feedback and explanations. Progress and scores in the browser (no accounts, no
  personal data). Replaces LearnPress quizzes for most needs.
- **M/M Glossary** of terms (שווא נע, מפיק, מתג, דבקים…) with hover/tap definitions wherever a term
  appears.
- **M/M Text view of any verse or chapter** with toggles: letters only / + niqqud / + טעמים
  (tikkun-style practice). Text from public-domain sources (Westminster Leningrad Codex, or
  Sefaria's API).
- **M/S Reply notifications:** email a commenter when the admin answers (they already leave an
  email; today it is stored and never used).
- **M/S Weekly parasha shortcut** (Hebcal API, free): "this week's reading" linking to recordings.
- **L/M Printable worksheets** (PDF) for teachers.
- **Decide later:** accounts (only if progress must follow a learner between devices), an English
  edition (the bar/bat-mitzvah market abroad is large; a strategic choice for Arye).

## 3. Security

Done: CSP and security headers, Turnstile, rate limit, honeypot, secret scanning, history scrub.

- **H/S Account protection:** two-factor authentication on Cloudflare, Bluehost, GitHub and the
  domain registrar; GitHub push protection and branch protection on `main`.
- **H/S DNS:** DNSSEC and CAA records (only Cloudflare's certificate authorities may issue for
  mikraot.net).
- **H/S Email authentication** when email moves off Bluehost: SPF, DKIM, DMARC (`p=quarantine`, then
  `reject`), so nobody can send mail as @mikraot.net.
- **H/M Comment moderation page** behind Cloudflare Access (free; login by Arye's email only): delete,
  hide, reply as admin. Today moderation means a database command.
- ✅ **M/S Dependency updates:** Renovate (or Dependabot) with CI, plus `npm audit` in CI. _(done 2026-10-04: renovate.json, active once on GitHub)_
- **M/S Backups:** D1 Time Travel keeps 30 days; add a weekly export of the comments table
  (scheduled Worker → R2 or a private repo).
- **M/S Privacy (חוק הגנת הפרטיות, amendment 13):** collect less: stop asking for an email unless
  reply notifications are built; state retention and deletion in the privacy policy.
- **L/S** `/.well-known/security.txt`, HSTS preload once stable, Cloudflare WAF managed rules (free
  set).

## 4. Technical and management

- **H/M Publishing pipeline:** GitHub → CI → Cloudflare deploy, with a **preview URL for every
  change** (Workers preview versions), so Arye sees a change live before approving it.
- **H/M Editing in the browser:** Keystatic in GitHub mode: an edit becomes a pull request with its
  preview; approving publishes. No terminal needed for content.
- **M/S Monitoring:** Workers observability is on; add alerts on error rate and a free uptime check
  (Cloudflare health check or UptimeRobot) that notifies by email.
- **M/S Images:** serve the banner and content images as AVIF/WebP via Astro's image pipeline (the
  banner is the page's largest element).
- **M/S Clean-up at cutover:** remove the old `mikraot-api` Worker, `/staging/` on Bluehost, Supabase
  (if unused), the `worker/` folder.
- **L/S** A short "how to" for Arye: add a page, add audio, reply to a comment, publish.

## 5. Tools that prevent bugs

Already in place: strict TypeScript, oxlint, Prettier, Vitest, Playwright (desktop + phone), axe,
gitleaks, `compare:live`, CI workflow.

- ✅ **H/S Link checker in CI** (replaces the Broken Link Checker plugin): every internal link and _(done 2026-10-04: linkinator, every test run + weekly outside links)_
  `#anchor` must resolve at build; external links checked weekly, report only.
- **H/S Content checks at build:** every audio and image file exists, every YouTube ID is valid,
  every `?page_id` is converted, no empty headings.
- **M/S Consistent Hebrew encoding:** the same word can be stored with its marks in different orders
  (seen in tests: two spellings of בראשית that look identical). A check that flags mixed orderings
  keeps search and links reliable. (Don't auto-normalize: Unicode normalization can reorder marks in
  ways that render badly.)
- **M/M Visual regression:** Playwright screenshots of key pages compared on every change.
- **M/S Lighthouse CI** with budgets (performance, accessibility, SEO) on a few pages.
- **M/S Client error reporting:** a tiny handler that sends browser errors to the Worker logs (no
  third-party service).
- **L/S HTML validation** (`html-validate`) of the build.

## 6. Tracking the user experience

Yes, but privacy-first, with no cookies, so no consent banner is needed:

- **H/S Cloudflare Web Analytics:** page views, referrers, countries, devices, Core Web Vitals.
- **H/S Google Search Console** (and Bing Webmaster Tools): the queries that bring people, pages
  with indexing problems.
- **H/S Search with no results:** log the query (anonymous) → a ready-made list of missing content.
- **M/S Content events** via Workers Analytics Engine (free tier): audio plays, video plays, hidden
  answers opened, 404 URLs.
- **M/S "Was this page helpful?"** 👍/👎 with an optional comment, stored in D1.
- **Avoid** session recording (Hotjar, Clarity): needs a consent banner and records personal
  behaviour; not worth it at this size.
- Define a few numbers to watch: returning visitors, audio plays per visit, searches without
  results, most common exit pages.

## 7. What comparable sites do

(From general knowledge; not a traffic study.)

- **Sefaria:** free, open-source library of Jewish texts with an open API and open licences; very
  successful. Lesson: openness and linking (every source is a link) bring reach and partners.
- **AlHatorah.org:** Mikraot Gedolot and study tools; deep, scholarly, well respected.
- **Mechon Mamre:** plain HTML, decades old, still heavily used. Lesson: reliable text beats
  design.
- **Tikkun apps and sites (e.g. Tikkun.io):** side-by-side text with/without vowels and trope for
  practice; popular with Torah readers.
- **Trope Trainer and similar paid software:** long-lived commercial products for bar/bat-mitzvah
  preparation: audio for every verse, word highlighting, nusach choice. Shows the demand for
  read-along practice.
- **YouTube parasha readings:** very popular; audio/video is how many people actually learn trope.
- **What the successful ones share:** audio for everything, a practice loop (hear → try → check),
  a clear goal (read my portion), free access, works on a phone.
- **Mikraot's niche:** no other free Hebrew site explains _why_ (grammar rules, hierarchy of
  טעמים) as clearly. Keep that, and add the practice loop around it.

## 8. Content

- **H/M Audio for the pronunciation and grammar pages** (שווא נע, קמץ קטן, אותיות נחות, מפיק, דגש
  חזק): today only מבטא and דגש קל have recordings.
- **H/M A trope chart page:** every טעם with its symbol, name, a short example and audio in each
  נוסח. Probably the most searched topic.
- **H/S Finish the drafts:** משמעות הטעמים, ניגון סוף עליה, טעמי אמ״ת, אתרים וכלים ללימוד.
- **H/S "Where to start"** page: a suggested order for beginners, and for someone preparing to read
  in synagogue.
- **M/M One template for lessons:** goal → rule → examples (with audio) → exceptions → exercises →
  summary. Makes the site feel like a course and makes gaps visible.
- **M/L More נוסחים:** Sephardi-Yerushalmi first (largest Israeli audience), then Teimani.
- **M/M Haftarah and Megillot** trope (different melodies, same symbols): a natural next section.
- **M/S Glossary page** (also feeds the hover definitions).
- **M/S Internal links:** each lesson links to the related ones (דגש קל ↔ שווא נע ↔ בג״ד כפ״ת).
- **M/S SEO texts:** some pages have no meta description; add short ones in Keystatic.

## 9. Also worth considering

- **Share previews:** generate a social image per page at build (title over the banner photo); few
  pages have one now.
- **Structured data:** BreadcrumbList and LearningResource JSON-LD for richer search results.
- **Licence the content** (e.g. CC BY-NC-SA) so teachers can share it legally; state rights for the
  recordings.
- **Community:** reach teachers and synagogue gabbaim (they send learners); a WhatsApp channel or
  the newsletter for new lessons.
- **Questions for Arye** (answered 2026-10-03, see Direction): who is the main audience (adult beginners,
  bar/bat-mitzvah, synagogue readers, teachers)? What is success (reach, impact, income)? How many
  hours a month go to new content?

## 10. Found while building (2026-10-04)

- **H/S Weekly habit, two minutes:** when adding or improving content, add an "update" line in the
  editor (date + one sentence). It appears in "מה חדש" and goes to newsletter subscribers
  automatically; without it, new content stays invisible to returning learners.
- **H/S Know about new comments before email exists:** subscribe to `/comments/feed/` in a feed
  reader app, or with a free RSS-to-email service, until the site can send email itself.
- **M/S Plain-letter aliases for URLs with niqqud:** e.g. `/פַּשְׁטָא֙-זָקֵף-קָטָ֔ן/` becomes ~180
  characters when shared and can't be typed. Keep it (search engines know it) and add redirects
  from `/פשטא-זקף-קטן/` style aliases.
- **M/S Check production after every deploy:** run the link crawl and a few read-only browser tests
  against https://mikraot.net (a base-URL option for the test setup).
- **M/S Better Hebrew in the editor:** Keystatic is open source; contributing proper Hebrew
  interface strings (today "Save" = "להציל") fixes it for us and every Hebrew user.
- **L/S** The rarest טעמים (e.g. ירח בן יומו) now render correctly in Taamey D; a one-page
  "how the marks look" reference (all marks, enlarged) would double as a visual test.

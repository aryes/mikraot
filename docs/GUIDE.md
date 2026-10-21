# How to: a short guide for Arye

Everyday tasks on the new site. You edit; Claude checks, saves to git and publishes. Nothing you do
in the editor reaches the public site until it is published.

## Open the editor

Ask Claude to "open the editor" (or run `npm run cms` yourself). It opens at
http://localhost:4400/keystatic, in the browser pane or any browser on the laptop. The same server
shows the site as you edit it: a page's address with `localhost:4400` in front, e.g.
http://localhost:4400/דגש-קל/.

The editor works on the laptop's copy of the site, without the internet (only new video pictures
are fetched from YouTube).

## Change a page

1. In **עמודים ופוסטים**, open the page.
2. Edit the text. The toolbar has the site's own marks: **אות נלמדת (כתום)**, **הקשר (אפור)**,
   **אות שאינה נשמעת (אפור בהיר)**, and blocks: **ביאור מוסתר**, **פתרון מוסתר (פסקאות)**,
   **הקלטה**, **סרטון YouTube**.
3. Press **שמירה** (top left). (On the site settings page the button still says "Save".)
4. Check the result at `localhost:4400` followed by the page's address.

Don't change the address (**כתובת**) of an existing page: links to it from other pages, from
search engines and from other sites would stop working.

## Add a page or a post

1. In **עמודים ופוסטים**, press **הוספה**.
2. Fill in **כותרת**; the address (**כתובת**) is filled in from it, and you may shorten it. Then
   **סוג** (עמוד or פוסט), **עמוד אב** (where it sits; this also sets the start of its address)
   and **סדר**.
3. Write the content and press **יצירה**.
4. A page appears in the top menu only once Claude adds it there (tell Claude where).
5. Not ready yet? Tick (סמנו) **טיוטה** and it stays off the site. Note that drafts are still
   saved in the project's public code repository, so don't write anything private in them.

## Add a recording

1. Send the MP3 to Claude (or put it in the site folder `public/wp-content/uploads/<year>/<month>/`).
2. In the page, insert **הקלטה** and enter its path, starting with `/wp-content/`, e.g.
   `/wp-content/uploads/2026/10/שווא.mp3`.

A path to a missing file is caught by the checks before anything is published.

## Add a video

Insert **סרטון YouTube** with the video's id: the 11 characters after `v=` in its YouTube address
(`youtube.com/watch?v=ATPZtXouTC0` → `ATPZtXouTC0`). The site shows its picture and title on its own.
A mistyped id is caught when the site is built.

## Add a recorded reading to a list

On the recorded-readings pages the readings are a nested list inside **בורר**: part, book,
parasha, reading (or part, book, chapter). Visitors choose row by row. Add a line at the right
level with its link (a YouTube video opens in the site's player). A book without any linked
reading isn't offered, so it can be added ahead of its recordings.

## Tell readers what's new

In the page's settings, under **הודעות על תוכן חדש בעמוד**, add a line (date and one sentence).
It appears on the "מה חדש" page (linked under the front page's latest posts and in the footer), and will go to newsletter subscribers once
the newsletter is set up. New posts are announced automatically.

## Headings

Choose the level by the page's structure: level 2 for main sections, 3 inside them. To make a
heading look smaller without changing its level, set its **גודל** to **קטן**.

## Publish

Tell Claude "publish". Claude runs the checks (content, tests, accessibility), saves the change to
git with a description, and publishes. The site, https://mikraot.net, updates within a few minutes.

## Comments

- Each new comment is emailed to you (admin@mikraot.net), with the page, the text and the
  commenter's email if given. Replying to that email answers the commenter privately.
- To hide a comment, open the "ניהול התגובה" link in its email and press "הסתר תגובה". The same
  link shows it again ("החזר תגובה"); a hidden comment is kept, not deleted. Replies to a hidden
  comment stay visible, moved to the top of the list. The link works only
  for that comment and doesn't expire, so don't forward the email to anyone who shouldn't manage
  it.
- To reply on the site, or to delete a comment, ask Claude.

## If something looks wrong

Tell Claude what you see and on which page. Every published version is kept, so any change can be
undone.

## If Claude is unavailable

Everything below works from a browser, with your own logins, and none of it needs the laptop or a
command. When in doubt, do nothing: the site keeps running on its own, and backups are made daily.

**Emails you may get, and what they mean**

- **"תקלה במקראות: בקשה לאתר נכשלה"**: one visit to the site failed. A single email (at most one
  an hour) is usually nothing. Open the site: if pages load, ignore it. If emails keep coming every
  hour, or pages fail, see "The site is broken" below.
- **"תקלה במקראות: הגיבוי היומי נכשל"**: last night's copy of the comments wasn't made. The site
  is fine; one missed night is harmless. Several nights in a row need a developer.
- **UptimeRobot, "down"**: the site didn't answer. Open it yourself; also check
  <https://www.cloudflarestatus.com> (if Cloudflare has a problem, just wait).
- **Sentry, "new issue"**: an error a visitor's browser or the server reported. Read it only if the
  site misbehaves; most are harmless (old browsers, extensions).
- **GitHub, a failed "Daily check"** (if GitHub's notifications for failed runs are on): the daily
  outside check found something off, such as a missing backup or traffic near the free limit. It
  needs a developer only if it repeats.

**The site is broken**

1. **Stop automatic publishing first**, or the next update would undo your fix: Cloudflare
   dashboard → Workers & Pages → mikraot → Settings → Builds → Disconnect. Updates (Claude's, and
   the automatic dependency updates, which can come any day) then stay on GitHub unpublished, until
   a developer reconnects it.
2. **In the first weeks after the switch: go back to WordPress.** Same place → Settings → Domains &
   Routes → delete the route `mikraot.net/*`. WordPress is back within seconds. Comments made on
   the new site meanwhile stay in its database, hidden until the next switch forward.
3. **Later, or if step 2 doesn't apply: go back one version.** Same place → Deployments → the
   version before the problem → ⋯ → Rollback. Cloudflare may refuse a rollback across a change in
   the site's storage settings; then go back to WordPress (step 2) if that's still possible, or
   wait for a developer.

**A spam or offensive comment**: the "ניהול התגובה" link in its email → "הסתר תגובה".

**Getting help**: any web developer can take over from `CLAUDE.md` (how the site is built) and
`docs/OPERATIONS.md` (every procedure: restore, rollback, limits, expiry dates), both in the public
repository <https://github.com/aryes/mikraot>. Accounts are yours: Cloudflare (site and database),
GitHub (code), Brevo (emails and newsletter), Sentry (errors), UptimeRobot, Umami (statistics), and
the domain's registrar. Give a developer access through each service's own team or member settings,
never by sharing your password.

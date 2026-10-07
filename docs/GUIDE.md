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

## Tell readers what's new

In the page's settings, under **הודעות על תוכן חדש בעמוד**, add a line (date and one sentence).
It appears in "מה חדש" in the sidebar and on its page, and will go to newsletter subscribers once
the newsletter is set up. New posts are announced automatically.

## Headings

Choose the level by the page's structure: level 2 for main sections, 3 inside them. To make a
heading look smaller without changing its level, set its **גודל** to **קטן**.

## Publish

Tell Claude "publish". Claude runs the checks (content, tests, accessibility), saves the change to
git with a description, and publishes. The site updates within a few minutes (until the cutover:
the test site, https://mikraot.mikraot-app.workers.dev).

## Comments

- Each new comment is emailed to you (admin@mikraot.net), with the page, the text and the
  commenter's email if given. Replying to that email answers the commenter privately.
- To reply on the site, or to hide or delete a comment, ask Claude (a moderation page is planned).

## If something looks wrong

Tell Claude what you see and on which page. Every published version is kept, so any change can be
undone.

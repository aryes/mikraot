# Design review

Part of every change that affects how pages look (Arye, 2026-10-12): Claude runs it without being
asked, like the fresh-eyes code review (CLAUDE.md, rules 4 and 11), and fixes valid findings
before the change goes in.

"Affects how pages look": CSS (`src/styles/`), components, layouts, `markdoc.config.mjs`, and
content markup (tags, tables, headings in `src/content/pages/`).

## On each visual change

1. **Screenshots**, with a Playwright script, saved in Claude's scratchpad (never in the repo):
   the affected pages before (a build of `main`, or the deployed test site) and after (the
   change's build, served with `npx astro preview`), on desktop (1366 px wide), phone (Pixel 7)
   and in dark mode; full pages, scrolled to the end so lazy parts (comments) have loaded.
   Always include the page types of `e2e/visual.spec.ts` (home, lesson, post, the videos page
   `/טעמים/נוסח-אשכנז/`, about) when the change touches shared parts.
2. **Review:** a context-free reviewer (subagent) gets the screenshots and the checklist below,
   and reports concrete findings with the page and place.
3. **Fix** the valid findings; name any finding judged wrong to Arye, with the reason.
4. **Record** the findings and what was done in the pull request's description.

`e2e/visual.spec.ts` catches _unintended_ visual changes; this review judges the _intended_ ones,
including the reference images updated with the change.

## Checklist

- **Hierarchy:** the page's main point stands out; headings read as headings; nothing competes
  with the title.
- **Consistency:** the same thing looks the same on every page (titles, buttons, links,
  taglines, spacing, card styles); one font, the site's colours.
- **Space:** nothing crowded or touching (buttons, table cells); no large empty areas or boxes
  with almost nothing in them; long lists use the width they have.
- **Hebrew:** vowel and cantillation marks not clipped or colliding (line height, table cells,
  headings); right-to-left layout correct (alignment, arrows, order).
- **Phone:** content comes first; no sideways page scroll; tap targets comfortable (about
  24 px or more apart); tables readable.
- **Readability:** text size and line length comfortable (about 45–90 characters a line);
  contrast meets WCAG AA in light and dark mode (the accessibility tests check it too).
- **Print:** pages print light and clean, without navigation (`e2e/site.spec.ts` checks part
  of it).
- **Content signals:** nothing that looks stale, broken or unfinished (old dates as "new",
  placeholder text, a lone item under a heading).
- **Interaction:** controls look like what they do (an inactive button says why); loading and
  empty states are clear.
- **Parity (CLAUDE.md, rule 5):** nothing the live WordPress page shows is lost; `npm run
compare:live` checks the content.

## Periodically

A full review of the main page types against the checklist every few weeks and before
milestones (the cutover): tracked as an open item in `docs/ROADMAP.md`; findings go there too.

import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { LOCAL_ONLY } from './tags';

// Comments load lazily (island script on scroll) and then call a Worker endpoint that may start
// cold, which can exceed the default 5s under parallel test load.
const COMMENTS_LOADED = { timeout: 15_000 };

test('front page renders at /', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/^מקראות/);
  // As on the live site: the site name is the heading, the tagline under it.
  await expect(page.locator('h1')).toHaveText('מקראות');
});

test('hierarchical Hebrew WordPress URLs are served', async ({ page }) => {
  const response = await page.goto('/טעמים/נוסח-אשכנז/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('טעמים בנוסח אשכנז');
});

test('unknown URLs get a 404 page', async ({ page }) => {
  const response = await page.goto('/no-such-page/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toContainText('404');
  // It offers the site's search as well as the way home.
  await page.getByRole('main').getByRole('button', { name: 'חיפוש באתר' }).click();
  await expect(page.getByRole('dialog', { name: 'חיפוש באתר' })).toBeVisible();
});

test('collapsible explanations open and close', async ({ page }) => {
  await page.goto('/טעמים/נוסח-אשכנז/');
  const toggle = page.locator('.collapse-toggle-btn').first();
  const panel = page.locator(`#${await toggle.getAttribute('data-target')}`);
  await expect(panel).toBeHidden();
  await toggle.click();
  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(panel).toBeHidden();
});

test('an explanation button changes its words and colours when open', async ({ page }) => {
  await page.goto('/דגש-קל/');
  const toggle = page.locator('.collapse-toggle-btn:has(.collapse-label)').first();
  const label = toggle.locator('.collapse-label');
  await expect(label).toHaveText('הראה פתרון');
  await toggle.click();
  await expect(label).toHaveText('החבא פתרון');
  await page.mouse.move(0, 0); // off the button: hover has its own colours
  await expect(toggle).toHaveCSS('color', 'rgb(255, 255, 255)');
  await toggle.click();
  await expect(label).toHaveText('הראה פתרון');
});

// The fictional comments in e2e/fixtures/comments.sql exist only in the local database.
test(
  'approved comments load when the comments section scrolls into view',
  LOCAL_ONLY,
  async ({ page }) => {
    await page.goto('/טעמים/נוסח-אשכנז/');
    await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
    await expect(page.getByText('קורא לדוגמה')).toBeVisible(COMMENTS_LOADED);
    await expect(page.getByText('מנהל האתר')).toBeVisible(); // admin reply badge
    await expect(page.getByRole('heading', { name: 'תגובות ושאלות (2)' })).toBeVisible();
    await expect(page.getByText('ממתין לאישור')).toHaveCount(0); // unapproved stays hidden
  },
);

test(
  'replies appear under the comment they answer, and "reply" sets up the form',
  LOCAL_ONLY,
  async ({ page }) => {
    await page.goto('/טעמים/נוסח-אשכנז/');
    await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
    const first = page.locator('[id^="comment-"]', { hasText: 'תגובת בדיקה ראשונה' });
    await expect(first).toBeVisible(COMMENTS_LOADED);
    // The admin answer (a reply in the fixtures) sits in the thread right under the first comment.
    await expect(first.locator('xpath=following-sibling::div')).toContainText('תשובת מנהל לדוגמה');

    await first.getByRole('button', { name: 'השיבו לקורא לדוגמה' }).click();
    await expect(page.getByText('תגובה לקורא לדוגמה')).toBeVisible();
    await page.getByRole('button', { name: 'ביטול התגובה לתגובה' }).click();
    await expect(page.getByText('תגובה לקורא לדוגמה')).toHaveCount(0);
  },
);

test('a visitor can post a comment', LOCAL_ONLY, async ({ page }, testInfo) => {
  const text = `תגובת בדיקה ${testInfo.project.name} ${Date.now()}`;
  await page.goto('/about/');
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await expect(page.getByText('אורח לדוגמה')).toBeVisible(COMMENTS_LOADED);
  await expect(page.getByText('אורח לדוגמה 0')).toHaveCount(0); // no stray '0' from is_admin_reply
  // The form opens from its button.
  await page.getByRole('button', { name: 'כתבו תגובה או שאלה' }).click();
  // Found by their labels: each field is tied to its visible label (as screen readers read it).
  await page.getByRole('textbox', { name: 'שם *', exact: true }).fill('מבקר בדיקה');
  await page.getByRole('textbox', { name: 'תוכן התגובה *', exact: true }).fill(text);
  await page.getByLabel('שמרו את השם והאימייל שלי').check();
  // "Email me on replies" is offered only once there is an email to send to.
  const notify = page.getByLabel('שלחו לי אימייל כשמשיבים לתגובה שלי');
  await expect(notify).toHaveCount(0);
  await page.getByRole('textbox', { name: 'אימייל (לא יוצג באתר)' }).fill('visitor@example.com');
  await notify.check();
  await page.getByRole('button', { name: 'פרסום תגובה' }).click();
  await expect(page.getByText('התגובה נוספה בהצלחה!')).toBeVisible(COMMENTS_LOADED);
  await expect(page.getByText(text)).toBeVisible();
  await page.reload();
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await expect(page.getByText(text)).toBeVisible(COMMENTS_LOADED); // persisted in D1
  // "Remember me": the name comes back from this browser's storage.
  await page.getByRole('button', { name: 'כתבו תגובה או שאלה' }).click();
  await expect(page.getByRole('textbox', { name: 'שם *', exact: true })).toHaveValue('מבקר בדיקה');
  await expect(page.getByLabel('שמרו את השם והאימייל שלי')).toBeChecked();
});

test('menu links point to real WordPress URLs', async ({ page, isMobile }) => {
  await page.goto('/');
  if (isMobile) await page.getByLabel('תפריט').first().click();
  const menu = page.getByRole('navigation', { name: isMobile ? 'תפריט' : 'ניווט ראשי' });
  // On desktop the page sits in the 'הגיה' dropdown, which opens on hover.
  if (!isMobile) await menu.getByRole('button', { name: 'הגיה' }).hover();
  const link = menu.getByRole('link', { name: 'מבטא', exact: true });
  await expect(link).toHaveAttribute('href', '/מבטא/');
  await link.click();
  await expect(page).toHaveURL(/\/%D7%9E%D7%91%D7%98%D7%90\/$/);
  await expect(page.locator('h1')).toHaveText('מבטא');
});

test('media is served by the site at the WordPress paths', async ({ page, request }) => {
  const mp3 = await request.get('/wp-content/uploads/2023/07/ארגב.mp3');
  expect(mp3.status()).toBe(200);
  expect(mp3.headers()['content-type']).toContain('audio/mpeg');

  await page.goto('/דגש-קל/');
  const sources = await page
    .locator('.inline-audio-btn')
    .evaluateAll((buttons) => buttons.map((b) => b.getAttribute('data-audio-src') ?? ''));
  expect(sources.length).toBeGreaterThan(0);
  const statuses = await Promise.all(
    sources.map(async (src) => (await request.head(src)).status()),
  );
  sources.forEach((src, i) => {
    expect(src).toMatch(/^\/wp-content\/uploads\//);
    expect(statuses[i], src).toBe(200);
  });
});

test('pages keep the live site titles, and have descriptions and social tags', async ({ page }) => {
  await page.goto('/שווא-נע/');
  await expect(page).toHaveTitle('שווא נע - מקראות');
  // "title: description", short enough for Google to show whole (Arye, 2026-10-08).
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    /^שווא נע: .{20,145}$/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://mikraot.net/%D7%A9%D7%95%D7%95%D7%90-%D7%A0%D7%A2/',
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    'שווא נע - מקראות',
  );
});

test('sitemap lists every page; the WordPress sitemap URL redirects to it', async ({ request }) => {
  const index = await request.get('/sitemap-index.xml');
  expect(index.status()).toBe(200);
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  // 35 pages and posts (the privacy policy since 2026-10-13), the month and category archives,
  // "What's new" (the author archive is noindex).
  expect(sitemap.match(/<loc>/g)).toHaveLength(38);
  expect(sitemap).not.toContain('/author/');

  const old = await request.get('/sitemap.xml', { maxRedirects: 0 });
  expect(old.status()).toBe(302); // temporary until WordPress is retired
  expect(old.headers()['location']).toMatch(/\/sitemap-index\.xml$/);

  expect(await (await request.get('/robots.txt')).text()).toContain(
    'Sitemap: https://mikraot.net/sitemap-index.xml',
  );
});

test('content formatting renders: centred table cells and the meaningful colours', async ({
  page,
}) => {
  await page.goto('/דגש-קל/');
  const cell = page.locator('.wp-content-rendered td').first();
  await expect(cell).toHaveCSS('text-align', 'center');

  await page.goto('/שווא-נע/');
  const taught = page.locator('.wp-content-rendered .mark-highlight').first();
  await expect(taught).toHaveCSS('color', 'rgb(194, 65, 12)');
  await expect(taught).toHaveCSS('font-weight', '700');

  await page.goto('/silent-letters/');
  const silent = page.locator('.wp-content-rendered .mark-silent').first();
  await expect(silent).toHaveCSS('color', 'rgb(112, 112, 112)');
  await expect(silent).toHaveCSS('text-decoration-line', 'none');
});

test('heading anchors from WordPress survive (Hebrew ones included)', async ({ page }) => {
  await page.goto('/trope-hierarchy/');
  await expect(page.locator('#connected-tropes')).toHaveCount(1);
  await page.goto('/');
  await expect(page.locator('[id="הגיה"]')).toHaveCount(1);
});

test('the home page lists the latest posts, as on WordPress', async ({ page }) => {
  await page.goto('/');
  const post = page.locator('.latest-posts li').first();
  await expect(post.locator('a')).toHaveAttribute('href', '/בראשית/');
  await expect(post.locator('time')).toHaveText('11/08/2021');
  await expect(post.locator('.latest-posts-excerpt')).toContainText('בשמחה ובהתרגשות');
});

test('fonts are self-hosted and load (no third-party font requests)', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (req) => {
    if (/fonts.(googleapis|gstatic).com/.test(req.url())) external.push(req.url());
  });
  await page.goto('/שווא-נע/');
  await page.evaluate(() => document.fonts.ready);
  // Astro names each family with a hash ("Taamey David CLM-79fd…"); its sized fallbacks end in
  // "fallback: Arial" and load nothing. The page's own fonts must have loaded.
  const loaded = await page.evaluate(() =>
    [...document.fonts]
      .filter((face) => face.status === 'loaded' && !face.family.includes('fallback'))
      .map((face) => face.family.replace(/^"|"$/g, '').replace(/-[0-9a-f]+$/, '')),
  );
  // Taamey David for the text, Taamey D for the site name; Noto Sans Hebrew only for the few
  // symbols Taamey David lacks (the footer's ©), so it may load too.
  expect(loaded).toEqual(expect.arrayContaining(['Taamey David CLM', 'Taamey D']));
  expect(
    loaded.filter((f) => !['Taamey David CLM', 'Taamey D', 'Noto Sans Hebrew'].includes(f)),
  ).toEqual([]);
  expect(external).toEqual([]);
});

/** Font families Chrome actually used to draw the matched elements (including fallbacks). */
async function renderedFonts(page: Page, path: string, selector: string): Promise<string[]> {
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
  const perNode = await Promise.all(
    nodeIds.map(
      async (nodeId) => (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts,
    ),
  );
  return [...new Set(perNode.flat().map((font) => font.familyName))];
}

/** Families other than the site's own: Taamey David (all text), Noto for the symbols it lacks. */
const otherFonts = (families: string[]) =>
  families.filter((f) => f !== 'Taamey David CLM' && !f.startsWith('Noto '));

test('text with cantillation marks renders in the site font only (no other or system font)', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'uses the Chrome DevTools protocol');
  // The rarest marks in the content (קרני פרה, ירח בן יומו…) are on this page.
  const content = '.wp-content-rendered p, .wp-content-rendered li, h1';
  const families = await renderedFonts(page, '/טעמים-נדירים/', content);
  expect(families).toContain('Taamey David CLM');
  expect(otherFonts(families)).toEqual([]);
  // A post title with niqqud and a טעם, in an archive list.
  expect(otherFonts(await renderedFonts(page, '/2021/08/', '.latest-posts a'))).toEqual([]);
});

test('Arabic letters render in Noto Sans Arabic (their dots showed poorly in system fonts)', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'uses the Chrome DevTools protocol');
  // The pronunciation table's Arabic column. Pages without Arabic don't load the font at all
  // (the self-hosted fonts test above lists what /שווא-נע/ loads).
  const families = await renderedFonts(page, '/מבטא/', '.wp-content-rendered td');
  expect(families).toContain('Noto Sans Arabic');
  expect(otherFonts(families)).toEqual([]); // no system font for any letter in the tables
});

test('search finds pages by keyword (Ctrl+K), ignoring niqqud', async ({ page }) => {
  await page.goto('/about/');
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'חיפוש באתר' });
  await expect(dialog).toBeVisible();

  await dialog.getByRole('searchbox').fill('בראשית');
  // Match by URL: niqqud marks can be stored in different orders, so text patterns are fragile.
  await expect(dialog.locator('a[href="/בראשית/"]')).toBeVisible();

  await dialog.getByRole('searchbox').fill('דגש קל');
  const first = dialog.getByRole('listitem').first().getByRole('link');
  await expect(first).toContainText('דגש קל');
  await page.keyboard.press('Escape'); // closes even with text in the box
  await expect(dialog).toBeHidden();
  await page.keyboard.press('Control+k');
  await first.click();
  await expect(page.locator('h1')).toHaveText('דגש קל');
});

// Typing a query that finds nothing would count it on a deployed site (src/scripts/search.ts).
test('search opens from the header button and reports no results', LOCAL_ONLY, async ({ page }) => {
  // Stub the index: real Pagefind still returns weak single-letter matches for most queries.
  await page.route('**/pagefind/pagefind.js', (route) =>
    route.fulfill({
      contentType: 'text/javascript',
      body: 'export const search = async () => ({ results: [] });',
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'חיפוש באתר' }).click();
  const dialog = page.getByRole('dialog', { name: 'חיפוש באתר' });
  await dialog.getByRole('searchbox').fill('מילה');
  await expect(dialog.getByText('לא נמצאו תוצאות עבור "מילה"')).toBeVisible();
});

test('pages carry structured data for search engines (as All in One SEO did)', async ({ page }) => {
  const jsonLd = async (path: string) => {
    await page.goto(path);
    const json = (await page.locator('script[type="application/ld+json"]').textContent()) ?? '';
    expect(() => JSON.parse(json), path).not.toThrow();
    return json;
  };
  const front = await jsonLd('/');
  expect(front).toContain('"@type":"WebSite"');
  expect(front).not.toContain('BreadcrumbList');
  expect(await jsonLd('/טעמים/נוסח-אשכנז/')).toContain('"@type":"BreadcrumbList"');
  expect(await jsonLd('/בראשית/')).toContain('"@type":"BlogPosting"');
  await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', / - מקראות$/);
});

test('search matches abbreviations however they are typed: " or ״, apostrophe or ׳', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'חיפוש באתר' });
  const results = async (query: string) => {
    // Clear first, so the previous query's results can't be read as this one's.
    await dialog.getByRole('searchbox').fill('');
    await expect(dialog.getByRole('link')).toHaveCount(0);
    await dialog.getByRole('searchbox').fill(query);
    await expect(dialog.getByRole('link').first()).toBeVisible();
    return dialog.getByRole('link').allTextContents();
  };
  expect(await results('תנ"ך')).toEqual(await results('תנ״ך'));
  expect(await results("ו' החיבור")).toEqual(await results('ו׳ החיבור'));
});

test('a printed lesson keeps the content and drops navigation, comments and players', async ({
  page,
}) => {
  await page.goto('/דגש-קל/');
  // An opened explanation prints with its button readable (white on colour on screen).
  await page.locator('.collapse-toggle-btn').first().click();
  await page.emulateMedia({ media: 'print' });
  const layoutParts = page.locator(
    'header, footer, aside, .banner-photo, .inline-audio-btn:not(.audio-tile), .audio-tile svg, [data-pagefind-ignore], dialog',
  );
  expect(await layoutParts.count()).toBeGreaterThan(5);
  const visible = await layoutParts.evaluateAll((parts) =>
    parts.filter((part) => part.checkVisibility()).map((part) => part.outerHTML.slice(0, 80)),
  );
  expect(visible).toEqual([]);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('table').first()).toBeVisible();
  // A letter that is also a play button prints as the letter.
  await expect(page.locator('.audio-tile-letter').first()).toBeVisible();
  // Printers drop backgrounds by default: text that relied on one must turn dark.
  const black = 'rgb(0, 0, 0)';
  await expect(page.locator('th').first()).toHaveCSS('color', black);
  await expect(page.locator('.collapse-toggle-btn[aria-expanded="true"]')).toHaveCSS(
    'color',
    black,
  );
  await expect(page.getByText('מקראות: https://mikraot.net/דגש-קל/')).toBeVisible();

  // A recording in its own column (מבטא) doesn't print.
  await page.goto('/מבטא/');
  await expect(page.locator('td .inline-audio-btn').first()).toBeHidden();
});

test(
  'a search that found nothing is counted once the visitor closes the search',
  LOCAL_ONLY,
  async ({ page, request }) => {
    await page.route('**/pagefind/pagefind.js', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: 'export const search = async () => ({ results: [] });',
      }),
    );
    const reports: unknown[] = [];
    page.on('request', (sent) => {
      if (sent.url().endsWith('/api/search-misses/')) reports.push(sent.postDataJSON());
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'חיפוש באתר' }).click();
    const dialog = page.getByRole('dialog', { name: 'חיפוש באתר' });
    const searchbox = dialog.getByRole('searchbox');
    // Letters typed on the way to the query are not counted, only the query that was left.
    await searchbox.fill('קמ');
    await searchbox.fill('קמץ חטוף');
    await expect(dialog.getByText('לא נמצאו תוצאות עבור "קמץ חטוף"')).toBeVisible();
    const delivered = page.waitForResponse((r) => r.url().endsWith('/api/search-misses/'));
    await page.keyboard.press('Escape');
    expect((await delivered).status()).toBe(204);
    expect(reports).toEqual([{ query: 'קמץ חטוף' }]);

    const post = (data: unknown) => request.post('/api/search-misses/', { data });
    expect((await post({ query: 'dana@example.com' })).status()).toBe(400);
    expect((await post({ query: 'x'.repeat(2000) })).status()).toBe(413);
  },
);

test(
  'an old /?s= search link is not counted as a search that found nothing',
  LOCAL_ONLY,
  async ({ page }) => {
    await page.route('**/pagefind/pagefind.js', (route) =>
      route.fulfill({
        contentType: 'text/javascript',
        body: 'export const search = async () => ({ results: [] });',
      }),
    );
    let reported = false;
    page.on('request', (sent) => {
      if (sent.url().endsWith('/api/search-misses/')) reported = true;
    });
    await page.goto('/?s=casino');
    const dialog = page.getByRole('dialog', { name: 'חיפוש באתר' });
    await expect(dialog.getByText('לא נמצאו תוצאות עבור "casino"')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.goto('/about/'); // pagehide
    expect(reported).toBe(false);
  },
);

/** Hebrew vowel points, cantillation marks and the maqaf (U+0591 to U+05C7). */
const HEBREW_MARK = /[\u0591-\u05C7]/;

test('pages with vowel points in their address also answer at a short address without them', async ({
  request,
}) => {
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  const marked = [...sitemap.matchAll(/<loc>https:\/\/mikraot\.net([^<]*)<\/loc>/g)]
    .map((match) => decodeURI(match[1] ?? ''))
    .filter((path) => HEBREW_MARK.test(path));
  expect(marked.length).toBeGreaterThan(0);
  // Each page's address without the marks (a maqaf becomes a hyphen), typed with or without
  // the final slash.
  const shortForms = marked.flatMap((path) => {
    const short = path.replace(/[\u0591-\u05BD\u05BF-\u05C7]/g, '').replace(/\u05BE/g, '-');
    return [short, short.replace(/\/$/, '')].map((form) => ({ form, page: path }));
  });
  const results = await Promise.all(
    shortForms.map(async ({ form, page }) => {
      const res = await request.get(encodeURI(form), { maxRedirects: 0 });
      return { form, page, status: res.status(), to: res.headers()['location'] ?? '' };
    }),
  );
  for (const { form, page, status, to } of results) {
    expect(status, form).toBe(302); // temporary until WordPress is retired (docs/CUTOVER.md)
    expect(decodeURI(new URL(to, 'https://mikraot.net').pathname), form).toBe(page);
  }
});

test('menu groups without a page are not links (header and footer)', async ({ page }) => {
  await page.goto('/');
  // Links without an address are reported as broken by crawlers and screen readers.
  await expect(page.locator('a:not([href])')).toHaveCount(0);
});

test('desktop menus open and close from the keyboard (Enter, Escape) and say so', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'the mobile menu shows every level at once');
  await page.goto('/');
  const menu = page.getByRole('navigation', { name: 'ניווט ראשי' });
  const group = menu.getByRole('button', { name: 'הגיה' });
  const subGroup = menu.getByRole('button', { name: 'דגשים' });
  await expect(group).toHaveAttribute('aria-expanded', 'false');

  await group.focus();
  await page.keyboard.press('Enter');
  await expect(group).toHaveAttribute('aria-expanded', 'true');
  await expect(menu.getByRole('link', { name: 'מבטא', exact: true })).toBeVisible();
  // Tab through the list to the 'דגשים' group, which has its own list.
  await expect(async () => {
    await page.keyboard.press('Tab');
    await expect(subGroup).toBeFocused({ timeout: 100 });
  }).toPass({ intervals: [0], timeout: 5000 });
  await page.keyboard.press('Enter');
  await expect(menu.getByRole('link', { name: 'דגש קל', exact: true })).toBeVisible();

  // Escape closes the innermost list first, focus returning to its button.
  await page.keyboard.press('Escape');
  await expect(subGroup).toHaveAttribute('aria-expanded', 'false');
  await expect(subGroup).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(group).toHaveAttribute('aria-expanded', 'false');
  await expect(group).toBeFocused();
  await expect(menu.getByRole('link', { name: 'מבטא', exact: true })).toBeHidden();

  // A page that is also a group keeps its link, with a separate button for its list.
  await page.getByRole('button', { name: 'דקדוק' }).click();
  await expect(menu.getByRole('link', { name: 'אותיות השימוש', exact: true })).toBeVisible();
  await menu.getByRole('button', { name: 'תפריט: אותיות השימוש' }).click();
  await expect(menu.getByRole('link', { name: /ה׳ הידיעה/ })).toBeVisible();
  // In a list opened by hovering, Escape returns to the group's button.
  await page.getByRole('heading', { level: 1 }).click();
  await menu.getByRole('button', { name: 'טעמים', exact: true }).hover();
  await menu.getByRole('link', { name: 'תפקידי הטעמים', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(menu.getByRole('button', { name: 'טעמים', exact: true })).toBeFocused();

  // A click elsewhere closes everything.
  await page.getByRole('heading', { level: 1 }).click();
  await expect(menu.locator('[aria-expanded="true"]')).toHaveCount(0);
});

test('the comment form says what is missing instead of refusing silently', async ({ page }) => {
  // Registered before the page loads: the comments may already be in view on a short page.
  const loaded = page.waitForResponse((r) => r.url().includes('/api/comments/') && r.ok());
  await page.goto('/about/');
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await loaded; // the form's button works once the comments section is running
  await page.getByRole('button', { name: 'כתבו תגובה או שאלה' }).click();
  const name = page.getByRole('textbox', { name: 'שם *', exact: true });
  await expect(name).toBeFocused(); // the form opens at its first field
  await page.getByRole('button', { name: 'פרסום תגובה' }).click();
  await expect(page.getByText('נא לכתוב שם.')).toBeVisible();
  await expect(page.getByText('נא לכתוב את התגובה או השאלה.')).toBeVisible();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toBeFocused(); // back to the first field that needs something
  await name.fill('מבקר');
  await expect(page.getByText('נא לכתוב שם.')).toHaveCount(0);
});

test('the human check loads only when a visitor starts on the comment form', async ({ page }) => {
  const checks: string[] = [];
  page.on('request', (sent) => {
    if (sent.url().includes('challenges.cloudflare.com')) checks.push(sent.url());
  });
  // Registered before the page loads: the comments may already be in view on a short page.
  const loaded = page.waitForResponse((r) => r.url().includes('/api/comments/') && r.ok());
  await page.goto('/about/');
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await loaded;
  expect(checks).toEqual([]);
  const script = page.waitForRequest((r) => r.url().includes('challenges.cloudflare.com'));
  await page.getByRole('button', { name: 'כתבו תגובה או שאלה' }).click();
  await script;
});

test('embedded videos show their picture and load YouTube only when played', async ({ page }) => {
  const youtube: string[] = [];
  page.on('request', (sent) => {
    if (/youtube|ytimg|googlevideo|doubleclick/.test(new URL(sent.url()).hostname)) {
      youtube.push(sent.url());
    }
  });
  await page.goto('/טעמים/נוסח-אשכנז/');
  const play = page.getByRole('button', { name: 'הפעלת הסרטון' }).first();
  await play.scrollIntoViewIfNeeded();
  // The picture is served by the site itself (no request to YouTube for it).
  const picture = page.locator('div:has(> .video-play-btn) img').first();
  await expect(picture).toHaveJSProperty('complete', true);
  expect(await picture.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect(
    new URL(await picture.evaluate((img: HTMLImageElement) => img.currentSrc)).pathname,
  ).toMatch(/^\/_astro\//);
  expect(youtube).toEqual([]);

  const buttons = page.getByRole('button', { name: 'הפעלת הסרטון' });
  const before = await buttons.count();
  const name = (await play.getAttribute('aria-label')) ?? '';
  await play.click();
  // The player takes the picture's place and starts.
  const player = page.locator('iframe[src*="youtube-nocookie.com/embed/"]').first();
  await expect(player).toHaveAttribute('src', /autoplay=1/);
  // Screen readers hear which video: its title (from YouTube at build time) names the button and
  // then the player.
  const title = /^הפעלת הסרטון: (.+)$/.exec(name)?.[1];
  expect(title, name).toBeTruthy();
  await expect(player).toHaveAttribute('title', title ?? '');
  await expect(buttons).toHaveCount(before - 1);
});

test('home page outline: topic headings at level 2, drawn small as on WordPress', async ({
  page,
}) => {
  await page.goto('/');
  const headings = page.locator('.wp-content-rendered').getByRole('heading');
  await expect(headings).toHaveText(['הגיה', 'דקדוק', 'טעמים', 'דברי הימים']);
  // No level is skipped: the page title is h1 and these are all h2.
  for (const level of await headings.evaluateAll((all) => all.map((h) => h.tagName))) {
    expect(level).toBe('H2');
  }
  const topic = headings.first();
  await expect(topic).toHaveCSS('font-size', '20.8px'); // 1.3rem: just above the lesson text (1.25rem)
  await expect(topic).toHaveCSS('border-bottom-width', '0px');
});

test('every content page has its own share picture, a 1200×630 JPEG', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap-0.xml')).text();
  const pages = [...sitemap.matchAll(/<loc>https:\/\/mikraot\.net([^<]*)<\/loc>/g)].map(
    (match) => match[1] ?? '/',
  );
  expect(pages.length).toBeGreaterThan(30);
  const pictures = await Promise.all(
    pages.map(async (path) => {
      const html = await (await request.get(path)).text();
      // Archive pages (months, categories) have no picture of their own.
      const url = /<meta property="og:image" content="([^"]+)"/.exec(html)?.[1];
      if (!url) return { path: decodeURI(path), url: '', size: 'none' };
      const picture = await request.get(new URL(url).pathname);
      const meta = picture.ok() ? await sharp(await picture.body()).metadata() : undefined;
      const size = meta ? `${meta.format} ${meta.width}x${meta.height}` : 'missing';
      return { path: decodeURI(path), url: decodeURI(url), size };
    }),
  );
  const generated = pictures.filter(({ url }) => url.includes('/og/'));
  expect(generated.length).toBeGreaterThan(30);
  expect(generated.filter(({ size }) => size !== 'jpeg 1200x630')).toEqual([]);
});

test('visitor statistics (Umami) count only on mikraot.net, so tests and previews send nothing', async ({
  page,
}) => {
  const sent: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('gateway.umami.is')) sent.push(r.url());
  });
  await page.goto('/');
  await expect(page.locator('script[src="https://cloud.umami.is/script.js"]')).toHaveAttribute(
    'data-domains',
    'mikraot.net',
  );
  await page.goto('/no-such-page/'); // the "page not found" event
  await page.waitForLoadState('load');
  expect(sent).toEqual([]);
});

test('the recordings are chosen row by row: part, book, parasha, reading', async ({ page }) => {
  await page.goto('/קריאות-מוקלטות-בנוסח-אשכנז/');
  const rows = page.locator('.list-picker-row');
  // At first only the parts; books without recordings are not offered.
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByRole('button')).toHaveText(['תורה', 'כתובים']);

  await page.getByRole('button', { name: 'תורה' }).click();
  await page.getByRole('button', { name: 'ויקרא' }).click();
  // ויקרא has one parasha, opened right away.
  await expect(page.getByRole('button', { name: 'שמיני' })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByRole('group', { name: 'קריאה' }).getByRole('link')).toHaveCount(9);

  // A book of chapters names its row פרק; choosing again replaces the rows below.
  await page.getByRole('button', { name: 'כתובים' }).click();
  await page.getByRole('button', { name: 'רות' }).click();
  await expect(rows).toHaveCount(3);
  // The row's name isn't repeated on its links ("ב"), but is read out ("פרק ב").
  const chapter = page.getByRole('group', { name: 'פרק' }).getByRole('link', { name: 'פרק ב' });
  await expect(chapter).toHaveText('ב');
  await chapter.click();
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('רות · פרק ב');
  // Centred, with room around it (the reset of Tailwind had put it in a corner).
  const box = await page.getByRole('dialog').boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box && viewport) {
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(2);
    expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(2);
    expect(box.x).toBeGreaterThanOrEqual(15);
  }

  // The book's whole playlist plays in the same popup.
  await page.getByRole('dialog').getByRole('button', { name: 'סגירה' }).click();
  await page.getByRole('link', { name: 'הכול ברצף' }).click();
  await expect(page.getByRole('dialog').getByRole('heading')).toHaveText('רות');
  await expect(page.locator('dialog iframe')).toHaveAttribute(
    'src',
    /youtube-nocookie\.com\/embed\/videoseries\?list=[\w-]+&autoplay=1$/,
  );
});

test('the Babylonian-Iraqi recordings use the same picker: part, book, chapter', async ({
  page,
}) => {
  await page.goto('/קריאות-מוקלטות-בנוסח-בבלי-עירקי/');
  await page.getByRole('button', { name: 'נביאים' }).click();
  await page.getByRole('button', { name: 'מלאכי' }).click();
  await expect(page.getByRole('group', { name: 'פרק' }).getByRole('link')).toHaveText([
    'א',
    'ב',
    'ג',
    'הכול ברצף',
  ]);
});

test('in the letter tables a letter is its own play button, drawn large', async ({ page }) => {
  await page.goto('/דגש-קל/');
  const tile = page.getByRole('button', { name: 'השמע: בּ (ב דגושה)' });
  await expect(tile).toHaveText('בּ');
  const cellSize = await page
    .locator('.wp-content-rendered p') // text size, as in a table's text cells
    .first()
    .evaluate((td) => parseFloat(getComputedStyle(td).fontSize));
  const letterSize = await tile
    .locator('.audio-tile-letter')
    .evaluate((letter) => parseFloat(getComputedStyle(letter).fontSize));
  expect(letterSize / cellSize).toBeCloseTo(1.7, 1);
  await tile.click();
  await expect(tile.locator('.pause-icon')).toBeVisible();

  // Letters alone in a cell are large too: Arabic, and English for uniformity (not words).
  await expect(page.locator('td.cell-letter').filter({ hasText: /^\s*b\s*$/ })).toHaveCount(1);
  // Letters with an example: the letters large, the example under them a little smaller than text (0.85).
  const example = page.locator('td.cell-letter .cell-example').filter({ hasText: 'כמו במילה the' });
  await expect(example).toHaveCount(1);
  expect(
    await example.evaluate(
      (span) =>
        parseFloat(getComputedStyle(span.parentElement ?? span).fontSize) /
        parseFloat(getComputedStyle(span).fontSize),
    ),
  ).toBeCloseTo(1.7 / 0.85, 1);
  await page.goto('/מבטא/');
  await expect(page.locator('td.cell-letter').filter({ hasText: 'غ' })).toHaveCount(1);
  await expect(page.locator('td.cell-letter').filter({ hasText: /^\s*sh\s*$/ })).toHaveCount(1);
});

test('table headings that share a first word are grouped, so wide tables fit a phone', async ({
  page,
}) => {
  await page.goto('/דגש-קל/');
  const table = page.locator('.table-scroll').first();
  const rows = table.locator('thead tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.first().locator('th')).toHaveText([
    'האות הדגושה',
    'מקבילות',
    'האות הרפויה',
    'מקבילות',
  ]);
  await expect(rows.nth(1).locator('th')).toHaveText(['אנגלית', 'ערבית', 'אנגלית', 'ערבית']);
  // Six columns, no sideways scroll on a common phone (390 px and up).
  const width = page.viewportSize()?.width ?? 0;
  if (width >= 390) {
    expect(await table.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  }
});

import { expect, test, type Page } from '@playwright/test';
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
  await page.getByPlaceholder('השם שלכם').fill('מבקר בדיקה');
  await page.getByPlaceholder('כתבו את תגובתכם').fill(text);
  await page.getByLabel('שמרו את השם והאימייל שלי').check();
  await page.getByRole('button', { name: 'פרסום תגובה' }).click();
  await expect(page.getByText('התגובה נוספה בהצלחה!')).toBeVisible(COMMENTS_LOADED);
  await expect(page.getByText(text)).toBeVisible();
  await page.reload();
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await expect(page.getByText(text)).toBeVisible(COMMENTS_LOADED); // persisted in D1
  // "Remember me": the name comes back from this browser's storage.
  await expect(page.getByPlaceholder('השם שלכם')).toHaveValue('מבקר בדיקה');
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

test('pages keep the live site titles, descriptions and social tags', async ({ page }) => {
  await page.goto('/שווא-נע/');
  await expect(page).toHaveTitle('שווא נע - מקראות');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S{10}/);
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
  // 34 pages and posts, the month and category archives, "What's new" (the author archive is
  // noindex).
  expect(sitemap.match(/<loc>/g)).toHaveLength(37);
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
  await expect(silent).toHaveCSS('text-decoration-style', 'dotted');
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
  const loaded = await page.evaluate(() => ({
    body: document.fonts.check('16px "Noto Sans Hebrew Variable"', 'שווא'),
    heading: document.fonts.check('16px "Noto Serif Hebrew Variable"', 'שווא'),
  }));
  expect(loaded).toEqual({ body: true, heading: true });
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

/** Families other than the site's own fonts (Noto Hebrew for the interface, Taamey D for lessons). */
const notNoto = (families: string[]) =>
  families.filter((f) => !f.startsWith('Noto ') && f !== 'Taamey D');

test('text with cantillation marks renders in the site fonts only (no system fallback)', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'uses the Chrome DevTools protocol');
  // The rarest marks in the content (קרני פרה, ירח בן יומו…) are on this page.
  const content = '.wp-content-rendered p, .wp-content-rendered li, h1';
  const lesson = await renderedFonts(page, '/טעמים-נדירים/', content);
  expect(lesson).toContain('Taamey D');
  expect(notNoto(lesson)).toEqual([]);
  // A post title with niqqud and a טעם, in an archive list.
  expect(notNoto(await renderedFonts(page, '/2021/08/', '.latest-posts a'))).toEqual([]);
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
    'header, footer, aside, .banner-photo, .inline-audio-btn, [data-pagefind-ignore], dialog',
  );
  expect(await layoutParts.count()).toBeGreaterThan(5);
  const visible = await layoutParts.evaluateAll((parts) =>
    parts.filter((part) => part.checkVisibility()).map((part) => part.outerHTML.slice(0, 80)),
  );
  expect(visible).toEqual([]);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('table').first()).toBeVisible();
  // Printers drop backgrounds by default: text that relied on one must turn dark.
  const black = 'rgb(0, 0, 0)';
  await expect(page.locator('th').first()).toHaveCSS('color', black);
  await expect(page.locator('.collapse-toggle-btn[aria-expanded="true"]')).toHaveCSS(
    'color',
    black,
  );
  await expect(page.getByText('מקראות: https://mikraot.net/דגש-קל/')).toBeVisible();
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

test('menu groups without a page are not links (header and footer), and the keyboard opens their submenus', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  // Links without an address are reported as broken by crawlers and screen readers.
  await expect(page.locator('a:not([href])')).toHaveCount(0);
  test.skip(isMobile, 'the mobile menu shows every level at once');
  const menu = page.getByRole('navigation', { name: 'ניווט ראשי' });
  await menu.getByRole('button', { name: 'הגיה' }).focus();
  // The dropdown fades in; in its first frame it still counts as hidden for Tab.
  await expect(menu.getByRole('link', { name: 'מבטא', exact: true })).toBeVisible();
  // Tab through the dropdown until the 'דגשים' group (it has its own submenu) has focus.
  const group = menu.getByRole('button', { name: 'דגשים' });
  await expect(async () => {
    await page.keyboard.press('Tab');
    await expect(group).toBeFocused({ timeout: 100 });
  }).toPass({ intervals: [0], timeout: 5000 });
  await expect(menu.getByRole('link', { name: 'דגש קל', exact: true })).toBeVisible();
});

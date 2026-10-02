import { expect, test, type Page } from '@playwright/test';

const POST = '/בראשית/';
/** A link to the post (matched by address: its title has niqqud and cantillation marks). */
const postLink = (page: Page) => page.locator(`main a[href="${POST}"]`).first();

test('pages show the photo banner with title and breadcrumb trail', async ({ page }) => {
  await page.goto('/טעמים/נוסח-אשכנז/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('טעמים בנוסח אשכנז');
  const trail = page.getByRole('navigation', { name: 'פירורי לחם' });
  await expect(trail.getByRole('link', { name: 'תפקידי הטעמים' })).toHaveAttribute(
    'href',
    '/טעמים/',
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('מקראות');
  await expect(page.getByText('ראשית קריאה בתנ״ך').first()).toBeVisible();
});

test('a post links to its author, category and month archives, each listing it', async ({
  page,
}) => {
  const openFromPost = async (name: string, heading: string) => {
    await page.goto(POST);
    await page.getByRole('main').getByRole('link', { name, exact: true }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
    await expect(postLink(page)).toBeVisible();
  };
  await openFromPost('אריה', 'מחבר: אריה');
  await openFromPost('חדשות האתר', 'קטגוריה: חדשות האתר');
  await openFromPost('11/08/2021', 'חודש: אוגוסט 2021');
  // The author archive stays out of search engines, as on the live site.
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await page.goto('/author/arye_s/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
});

test('the sidebar lists the archive months and categories', async ({ page }) => {
  await page.goto('/about/');
  const sidebar = page.getByRole('complementary', { name: 'סרגל צד' });
  await sidebar.getByRole('link', { name: 'אוגוסט 2021' }).click();
  await expect(page).toHaveURL(/\/2021\/08\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('חודש: אוגוסט 2021');
  await page
    .getByRole('complementary', { name: 'סרגל צד' })
    .getByRole('link', { name: 'חדשות האתר' })
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('קטגוריה: חדשות האתר');
});

test('RSS feeds at the WordPress URLs', async ({ request }) => {
  const postUrl = `<link>https://mikraot.net${encodeURI(POST)}</link>`;
  const feeds = ['/feed/', '/category/חדשות-האתר/feed/', '/sitemap.rss'];
  const responses = await Promise.all(
    feeds.map(async (path) => {
      const res = await request.get(path);
      return { path, type: res.headers()['content-type'], body: await res.text() };
    }),
  );
  for (const { path, type, body } of responses) {
    expect(type, path).toContain('application/rss+xml');
    expect(body, path).toContain(postUrl);
  }
  const comments = await request.get('/comments/feed/');
  expect(comments.headers()['content-type']).toContain('application/rss+xml');
  // Fixture comments, linked to their anchor on the page (WordPress's #comment-<id>).
  expect(await comments.text()).toMatch(/<link>[^<]*\/about\/#comment-\d+<\/link>/);
});

test('old WordPress links still work', async ({ page }) => {
  await page.goto('/?p=1'); // the post's WordPress ID
  await expect(page).toHaveURL(new RegExp(`${encodeURI(POST)}$`));

  await page.goto('/?s=שווא');
  await expect(page.getByRole('dialog').getByRole('link').first()).toBeVisible();

  const redirects = await Promise.all(
    ['/page/2/', '/חברים/arye_s/', '/פעילות/'].map(async (path) => {
      const res = await page.request.get(path, { maxRedirects: 0 });
      return { path, status: res.status(), location: res.headers()['location'] ?? '' };
    }),
  );
  for (const { path, status, location } of redirects) {
    expect(status, path).toBe(301);
    expect(new URL(location, page.url()).pathname, path).toBe('/');
  }
});

test('comments keep their WordPress anchors', async ({ page }) => {
  await page.goto('/about/');
  await page.getByRole('heading', { name: /תגובות ושאלות/ }).scrollIntoViewIfNeeded();
  await expect(page.locator('[id^="comment-"]').first()).toBeVisible({ timeout: 15_000 });
});

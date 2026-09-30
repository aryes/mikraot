import { describe, expect, it } from 'vitest';
import { getYouTubeId, wpHtmlToSiteHtml } from './wp-html';

describe('getYouTubeId', () => {
  it.each([
    ['https://youtu.be/abcdefghijk', 'abcdefghijk'],
    ['https://www.youtube.com/watch?v=abcdefghijk', 'abcdefghijk'],
    ['https://www.youtube.com/watch?list=x&v=abcdefghijk', 'abcdefghijk'],
    ['https://www.youtube.com/embed/abcdefghijk', 'abcdefghijk'],
    ['https://example.com/watch?v=abcdefghijk', null],
  ])('%s -> %s', (url, id) => {
    expect(getYouTubeId(url)).toBe(id);
  });
});

describe('wpHtmlToSiteHtml', () => {
  it('turns a Gutenberg YouTube embed into a privacy-friendly player', () => {
    const html = wpHtmlToSiteHtml(
      '<figure class="wp-block-embed is-type-video"><div>https://youtu.be/abcdefghijk</div></figure>',
    );
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/abcdefghijk"');
    expect(html).not.toContain('<figure');
  });

  it('turns a bare YouTube URL paragraph into a player but leaves links in lists alone', () => {
    expect(wpHtmlToSiteHtml('<p>https://youtu.be/abcdefghijk</p>')).toContain('<iframe');
    const list = '<li><a href="https://youtu.be/abcdefghijk">x</a></li>';
    expect(wpHtmlToSiteHtml(list)).toBe(list);
  });

  it('removes Gutenberg block comments', () => {
    expect(wpHtmlToSiteHtml('<!-- wp:paragraph --><p>a</p><!-- /wp:paragraph -->')).toBe(
      '<p>a</p>',
    );
  });

  it('turns audio shortcodes into buttons, moving staging media to the live site', () => {
    const html = wpHtmlToSiteHtml(
      '[sc_embed_player fileurl="https://mikraot.net/staging/4160/wp-content/uploads/a.mp3"]',
    );
    expect(html).toContain('class="inline-audio-btn');
    expect(html).toContain('data-audio-src="https://mikraot.net/wp-content/uploads/a.mp3"');
  });

  it('turns collapse shortcodes into numbered, accessible toggles', () => {
    const html = wpHtmlToSiteHtml(
      '[bg_collapse view="link" text="ביאור"]first[/bg_collapse][bg_collapse]second[/bg_collapse]',
    );
    expect(html).toContain('data-target="collapse-1"');
    expect(html).toContain('aria-controls="collapse-2"');
    expect(html).toContain('<span>ביאור</span>');
    expect(html).toContain('<span>הצג / הסתר ביאור</span>');
    expect(html).toMatch(/id="collapse-1"[^>]*>\s*first/);
  });

  it('rewrites internal links (live and staging) to site paths with a trailing slash', () => {
    expect(wpHtmlToSiteHtml('<a href="https://mikraot.net/%d7%9e%d7%91%d7%98%d7%90">x</a>')).toBe(
      '<a href="/%d7%9e%d7%91%d7%98%d7%90/">x</a>',
    );
    expect(wpHtmlToSiteHtml('<a href="https://www.mikraot.net/staging/4160/about/">x</a>')).toBe(
      '<a href="/about/">x</a>',
    );
    expect(wpHtmlToSiteHtml('<a href="https://mikraot.net/">x</a>')).toBe('<a href="/">x</a>');
  });

  it('keeps query strings and anchors on internal links', () => {
    expect(wpHtmlToSiteHtml('<a href="https://mikraot.net/about/#top">x</a>')).toBe(
      '<a href="/about/#top">x</a>',
    );
    expect(wpHtmlToSiteHtml('<a href="https://mikraot.net/about?x=1">x</a>')).toBe(
      '<a href="/about/?x=1">x</a>',
    );
  });

  it('keeps media links absolute on the live site', () => {
    expect(
      wpHtmlToSiteHtml('<a href="https://mikraot.net/staging/4160/wp-content/uploads/a.pdf">x</a>'),
    ).toBe('<a href="https://mikraot.net/wp-content/uploads/a.pdf">x</a>');
  });
});

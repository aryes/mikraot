import { describe, expect, it } from 'vitest';
import { verifyConversion } from './verify-conversion';
import { UnsupportedContentError, wpToMarkdoc } from './wp-to-markdoc';

const siteLink = (path: string) => `/site/${path}`;
const convert = (html: string) => wpToMarkdoc(html, { siteLink }).trim();

/** Converts and checks that rendering the Markdoc back gives the same text and elements. */
function roundTrip(html: string): string {
  const markdoc = wpToMarkdoc(html, { siteLink });
  expect(verifyConversion(html, markdoc)).toEqual([]);
  return markdoc.trim();
}

describe('colour marks', () => {
  it.each([
    ['<span style="color: #ff6600;">א</span>', 'highlight'],
    [
      '<mark style="background-color:rgba(0, 0, 0, 0);color:#ff7304" class="has-inline-color">א</mark>',
      'highlight',
    ],
    ['<span class="has-inline-color has-luminous-vivid-orange-color">א</span>', 'highlight'],
    ['<span style="color:#c3c3c3" class="has-inline-color">א</span>', 'muted'],
    ['<span style="color: #d1cfcf;">א</span>', 'silent'],
  ])('%s -> {%% %s %%}', (span, mark) => {
    expect(roundTrip(`<p>ב${span}ג</p>`)).toBe(`ב{% ${mark} %}א{% /${mark} %}ג`);
  });

  it('drops colours without meaning', () => {
    expect(roundTrip('<p><span style="color: #000000;">א</span> ב</p>')).toBe('א ב');
  });

  it('puts colour tags outside bold, which Markdoc can parse', () => {
    expect(roundTrip('<p><strong><span style="color: #ff6600;">וְ</span></strong>לָבָ֥ן</p>')).toBe(
      '{% highlight %}**וְ**{% /highlight %}לָבָ֥ן',
    );
    expect(roundTrip('<p><strong>א <span style="color: #ff6600;">ב</span> ג</strong></p>')).toBe(
      '**א** {% highlight %}**ב**{% /highlight %} **ג**',
    );
  });
});

describe('shortcodes and embeds', () => {
  it('turns audio shortcodes into audio tags with site-relative media paths', () => {
    expect(
      roundTrip(
        '<p>א [sc_embed_player fileurl="https://mikraot.net/staging/4160/wp-content/uploads/a.mp3"]</p>',
      ),
    ).toBe('א {% audio src="/wp-content/uploads/a.mp3" /%}');
  });

  it('keeps inline collapses inline, with their expand/collapse text', () => {
    expect(
      roundTrip(
        '<p>א [bg_collapse view="link-inline" icon="eye" expand_text="&nbsp; הראה פתרון" collapse_text=" החבא פתרון" ]ב <strong>ג</strong>[/bg_collapse]</p>',
      ),
    ).toBe(
      'א {% collapse expandText="הראה פתרון" collapseText="החבא פתרון" %}ב **ג**{% /collapse %}',
    );
  });

  it('keeps an inline collapse that ends its paragraph inline (not a block)', () => {
    expect(roundTrip('<p>א [bg_collapse expand_text="" ]ב[/bg_collapse]</p><p>ג</p>')).toBe(
      'א {% collapse %}ב{% /collapse %}\n\nג',
    );
  });

  it('turns collapses that wrap whole blocks into block collapses (both closing styles)', () => {
    const own = roundTrip(
      '<p>[bg_collapse expand_text="" ]</p><p>א</p><ul><li>ב</li></ul><p>[/bg_collapse]</p>',
    );
    const inline = roundTrip('<p>[bg_collapse expand_text="" ]</p><p>א</p><p>ב[/bg_collapse]</p>');
    expect(own).toBe('{% collapse-block %}\nא\n\n- ב\n{% /collapse-block %}');
    expect(inline).toBe('{% collapse-block %}\nא\n\nב\n{% /collapse-block %}');
  });

  it('turns YouTube embeds and bare YouTube paragraphs into youtube tags', () => {
    expect(
      roundTrip(
        '<figure class="wp-block-embed is-type-video"><div class="wp-block-embed__wrapper">https://youtu.be/abcdefghijk</div></figure>',
      ),
    ).toBe('{% youtube videoId="abcdefghijk" /%}');
    expect(roundTrip('<p>https://www.youtube.com/watch?v=abcdefghijk</p>')).toBe(
      '{% youtube videoId="abcdefghijk" /%}',
    );
  });

  it('turns the latest-posts block into a tag and drops other block comments', () => {
    expect(
      convert(
        '<!-- wp:latest-posts {"displayPostContent":true} /--><!-- wp:paragraph --><p>א</p><!-- /wp:paragraph -->',
      ),
    ).toBe('{% latest-posts /%}\n\nא');
  });
});

describe('structure', () => {
  it('rejects centred blocks (WordPress only centres table cells, which CSS handles)', () => {
    expect(() => convert('<p class="has-text-align-center">א</p>')).toThrow(
      UnsupportedContentError,
    );
  });

  it('keeps heading anchors (including Hebrew ones) as an anchor attribute', () => {
    expect(roundTrip('<h2 id="הגיה">הגיה</h2>')).toBe('## הגיה{% anchor="הגיה" %}');
  });

  it('writes ordered, nested lists', () => {
    expect(roundTrip('<ol><li>א<ul><li>ב</li></ul></li><li>ג</li></ol>')).toBe(
      '1. א\n   - ב\n1. ג',
    );
  });

  it('writes tables as {% table %}, keeping line breaks except before audio', () => {
    const md = roundTrip(
      '<table><thead><tr><th>אות</th><th>צליל</th></tr></thead><tbody><tr><td>בּ<br>b</td><td>ב <br>[sc_embed_player fileurl="/wp-content/uploads/b.mp3"]</td></tr></tbody></table>',
    );
    expect(md).toBe(
      '{% table %}\n- אות\n- צליל\n---\n- בּ\\\n  b\n- ב {% audio src="/wp-content/uploads/b.mp3" /%}\n{% /table %}',
    );
  });

  it('drops empty paragraphs and leading/trailing line breaks', () => {
    expect(roundTrip('<p></p><p><br>א<br></p><p> </p>')).toBe('א');
  });

  it('keeps <kbd> spacing with non-breaking spaces', () => {
    expect(roundTrip('<ul><li><kbd>    </kbd>א</li></ul>')).toBe(
      '- {% kbd %}&nbsp;&nbsp;&nbsp;&nbsp;{% /kbd %}א',
    );
  });
});

describe('text and links', () => {
  it('escapes characters Markdoc would read as syntax', () => {
    // roundTrip() already proves the text survives; this pins down the escaping itself.
    expect(roundTrip('<p>א [1] ב &lt;x&gt; `c` \\ ד =&gt; ה</p>')).toBe(
      'א \\[1\\] ב \\<x\\> \\`c\\` \\\\ ד =\\> ה',
    );
  });

  it('keeps numbered text from turning into a list', () => {
    expect(roundTrip('<p>1. ראשון<br>2. שני</p>')).toBe('1\\. ראשון\\\n2\\. שני');
  });

  it('rejects text with Markdoc tag delimiters', () => {
    expect(() => convert('<p>{% x %}</p>')).toThrow(UnsupportedContentError);
  });

  it('rewrites site links, drops link tooltips and keeps external links', () => {
    expect(
      roundTrip(
        '<p><a href="https://mikraot.net/staging/4160/about/" title="https://mikraot.net/about/">א</a> <a href="https://he.wikipedia.org/wiki/x" title="t" target="_blank">ב</a></p>',
      ),
    ).toBe('[א](/site/about/) [ב](https://he.wikipedia.org/wiki/x)');
  });
});

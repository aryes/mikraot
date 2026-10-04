import { describe, expect, it } from 'vitest';
import { jsonLd, structuredData, type StructuredSite } from './structured-data';

const site: StructuredSite = {
  origin: 'https://mikraot.net',
  title: 'מקראות',
  tagline: 'ראשית קריאה בתנ״ך',
  author: { name: 'אריה', url: 'https://mikraot.net/author/arye_s/' },
};

const types = (...names: string[]) => names.map((name) => ({ '@type': name }));

describe('structuredData', () => {
  it('describes the front page as the website, without a breadcrumb trail', () => {
    const graph = structuredData(
      {
        url: 'https://mikraot.net/',
        name: 'מקראות',
        crumbs: [],
        heading: 'מקראות',
        isFrontPage: true,
      },
      site,
    );
    expect(graph['@graph']).toMatchObject(types('WebSite', 'Person', 'WebPage'));
  });

  it('gives a page its breadcrumb trail from the home page to itself', () => {
    const graph = structuredData(
      {
        url: 'https://mikraot.net/טעמים/נוסח-אשכנז/',
        name: 'טעמים בנוסח אשכנז - מקראות',
        crumbs: [{ title: 'תפקידי הטעמים', url: 'https://mikraot.net/טעמים/' }],
        heading: 'טעמים בנוסח אשכנז',
        isFrontPage: false,
      },
      site,
    );
    expect(graph['@graph']).toMatchObject(types('WebSite', 'Person', 'WebPage', 'BreadcrumbList'));
    expect(graph['@graph'][3]).toMatchObject({
      itemListElement: [
        { position: 1, name: 'ראשי' },
        { position: 2, name: 'תפקידי הטעמים' },
        { position: 3, name: 'טעמים בנוסח אשכנז' },
      ],
    });
  });

  it('adds the article for a post', () => {
    const graph = structuredData(
      {
        url: 'https://mikraot.net/בראשית/',
        name: 'בראשית - מקראות',
        crumbs: [],
        heading: 'בראשית',
        isFrontPage: false,
        post: { datePublished: new Date('2021-08-11T00:00:00Z'), section: 'חדשות האתר' },
      },
      site,
    );
    expect(graph['@graph'].at(-1)).toMatchObject({
      '@type': 'BlogPosting',
      headline: 'בראשית',
      datePublished: '2021-08-11T00:00:00.000Z',
      articleSection: 'חדשות האתר',
    });
  });

  it('escapes "<" so the JSON cannot end its script tag', () => {
    const graph = structuredData(
      { url: 'https://x/', name: '</script>', crumbs: [], heading: 'x', isFrontPage: true },
      site,
    );
    expect(jsonLd(graph)).not.toContain('</script>');
  });
});

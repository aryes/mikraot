/**
 * Structured data (schema.org JSON-LD) for search engines, as All in One SEO output it on the
 * WordPress site: the website, the page, its breadcrumb trail and, for posts, the article.
 * Types from schema-dts (Google's schema.org TypeScript definitions).
 */
import type {
  BlogPosting,
  BreadcrumbList,
  Graph,
  Person,
  Thing,
  WebPage,
  WebSite,
} from 'schema-dts';

export interface StructuredPage {
  /** Absolute URL of the page. */
  url: string;
  /** Document title (as in <title>). */
  name: string;
  description?: string | undefined;
  /** The trail above the page (absolute URLs), not including the home page or the page itself. */
  crumbs: { title: string; url: string }[];
  /** The page heading; the last breadcrumb. */
  heading: string;
  isFrontPage: boolean;
  post?: { datePublished: Date; section?: string | undefined } | undefined;
}

export interface StructuredSite {
  origin: string;
  title: string;
  tagline: string;
  author: { name: string; url: string };
}

const LANGUAGE = 'he-IL';

export function structuredData(page: StructuredPage, site: StructuredSite): Graph {
  const home = `${site.origin}/`;
  const ids = {
    website: `${home}#website`,
    person: `${home}#person`,
    webpage: `${page.url}#webpage`,
    breadcrumbs: `${page.url}#breadcrumblist`,
  };
  const website: WebSite = {
    '@type': 'WebSite',
    '@id': ids.website,
    url: home,
    name: site.title,
    description: site.tagline,
    inLanguage: LANGUAGE,
    publisher: { '@id': ids.person },
  };
  const person: Person = {
    '@type': 'Person',
    '@id': ids.person,
    name: site.author.name,
    url: site.author.url,
  };
  const webpage: WebPage = {
    '@type': 'WebPage',
    '@id': ids.webpage,
    url: page.url,
    name: page.name,
    ...(page.description && { description: page.description }),
    inLanguage: LANGUAGE,
    isPartOf: { '@id': ids.website },
    ...(!page.isFrontPage && { breadcrumb: { '@id': ids.breadcrumbs } }),
  };
  const nodes: Thing[] = [website, person, webpage];

  if (!page.isFrontPage) {
    const trail = [
      { title: 'ראשי', url: home },
      ...page.crumbs,
      { title: page.heading, url: page.url },
    ];
    const breadcrumbs: BreadcrumbList = {
      '@type': 'BreadcrumbList',
      '@id': ids.breadcrumbs,
      itemListElement: trail.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.title,
        item: crumb.url,
      })),
    };
    nodes.push(breadcrumbs);
  }

  if (page.post) {
    const article: BlogPosting = {
      '@type': 'BlogPosting',
      '@id': `${page.url}#blogposting`,
      headline: page.heading,
      datePublished: page.post.datePublished.toISOString(),
      author: { '@id': ids.person },
      publisher: { '@id': ids.person },
      inLanguage: LANGUAGE,
      mainEntityOfPage: { '@id': ids.webpage },
      ...(page.post.section && { articleSection: page.post.section }),
    };
    nodes.push(article);
  }

  return { '@context': 'https://schema.org', '@graph': nodes };
}

/** JSON for a <script type="application/ld+json"> block (escaped so it can't close the tag). */
export const jsonLd = (data: Graph) => JSON.stringify(data).replace(/</g, '\\u003c');

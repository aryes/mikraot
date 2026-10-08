/**
 * Share pictures (Open Graph): the image WhatsApp, Facebook and others show when a page is
 * shared, generated at build time by src/pages/og/[...route].ts.
 */

/** The address of a page's share picture; `path` as in SitePage ('' for the front page). */
export const ogImagePath = (path: string) => `/og/${path || 'index'}.jpeg`;

/** Whether a picture address is one of the generated ones (their size is known). */
export const isGeneratedOgImage = (url: string) => url.startsWith('/og/');

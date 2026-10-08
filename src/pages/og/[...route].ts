/**
 * A share picture for every page: its title over the site's banner photo (darkened), with the site
 * name under it. Drawn at build time by astro-og-canvas, Astro's ready-made generator, which lays
 * out right-to-left text; files at /og/<page path>.jpeg (src/lib/og.ts).
 *
 * The background is src/assets/og-background.jpg: the banner photo at 1200×630, 45% brightness.
 * Titles with vowel points or cantillation marks use the biblical-text font, as on the site.
 */
import { OGImageRoute } from 'astro-og-canvas';
import { pointedRanges } from '../../lib/pointed';
import { getSitePages, site } from '../../lib/site';

const FONTS = 'node_modules/@fontsource/noto-sans-hebrew/files/noto-sans-hebrew';
// The name these files carry inside (all weights), which is what the drawing library matches.
const NOTO = 'Noto Sans Hebrew Thin';
const pages = Object.fromEntries(
  (await getSitePages()).map(({ entry, path }) => [
    path || 'index',
    path ? entry.data.title : site.title,
  ]),
);

export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: (_path, title) => ({
    title,
    // As in og:site_name (BaseLayout.astro); the font has no en dash.
    description: `${site.title} - ${site.tagline}`,
    dir: 'rtl',
    // JPEG keeps each picture well under ~300 KB, above which WhatsApp often drops it.
    format: 'JPEG',
    quality: 85,
    bgImage: { path: './src/assets/og-background.jpg', fit: 'cover' },
    padding: 80,
    fonts: [
      `./${FONTS}-hebrew-400-normal.woff2`,
      `./${FONTS}-hebrew-700-normal.woff2`,
      `./${FONTS}-latin-400-normal.woff2`,
      './public/fonts/taamey-d/Taamey_D.woff2',
    ],
    font: {
      title: {
        families: pointedRanges(title).length > 0 ? ['Taamey D', NOTO] : [NOTO, 'Taamey D'],
        size: 76,
        weight: 'Bold',
        lineHeight: 1.2,
      },
      description: { families: [NOTO], size: 36, color: [226, 232, 240] },
    },
  }),
});

/**
 * The address (slug) Keystatic proposes for a new page's title (keystatic.config.tsx). Its default
 * generator keeps Latin letters only, so a Hebrew title gave an empty address. This keeps Hebrew
 * as WordPress did for the existing pages: words joined by hyphens, without vowel points,
 * cantillation marks or punctuation (geresh, gershayim, quotes), Latin letters in lower case.
 */
export function slugFromTitle(title: string): string {
  return title
    .normalize('NFC')
    .replace(/[\u05BE\u05C0\u05C3]/g, '-') // maqaf, paseq and sof pasuq separate words
    .replace(/[\u0591-\u05C7]/g, '') // vowel points and cantillation marks
    .replace(/[\u05F3\u05F4'"`\u2019\u201C\u201D]/g, '') // geresh, gershayim and quotes vanish inside words
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

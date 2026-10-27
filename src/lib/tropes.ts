/**
 * Trope names in the reading traditions (src/data/tropes.json, from the "טבלת שמות הטעמים" of
 * "תיקון קוראים סימנים"). The reader chooses a tradition in the header (src/scripts/nusach.ts);
 * names written with the `trope` tag, and the titles of trope pages, follow that choice.
 */
import tropes from '../data/tropes.json';

/** The traditions the names table gives. */
export const TRADITIONS = ['ashkenazi', 'sephardi', 'yemenite'] as const;
export type Tradition = (typeof TRADITIONS)[number];

/**
 * The traditions the header switch offers, the first being the default (what search engines and
 * readers without JavaScript see). Yemenite is left out until the site has content for it (Arye,
 * 2026-10-27).
 */
export const SWITCHABLE = ['ashkenazi', 'sephardi'] as const satisfies readonly Tradition[];
export type Nusach = (typeof SWITCHABLE)[number];

type Trope = Record<Tradition, string> & { href?: string };
const byId: Record<string, Trope> = tropes;

/** A trope's names and page, by its id (the trope page's slug); unknown ids fail the build. */
export function trope(id: string): Trope & { href: string } {
  const found = byId[id];
  if (!found) throw new Error(`Unknown trope "${id}" (src/data/tropes.json)`);
  return { ...found, href: found.href ?? `/רשימת-הטעמים/${id}/` };
}

/** A name without the alternative the table adds in brackets ("רְבִ֗יעַ (רְבִיעִי)"). */
export const shortName = (name: string) => name.replace(/\s*\(.*\)$/, '');

/** A name without vowels, cantillation, maqaf or colon, for the tab title ("זקף גדול"). */
export const plainName = (name: string) =>
  shortName(name)
    .replaceAll('־', ' ')
    .replace(/[֑-ׇ:]/gu, '')
    .trim();

/** Each tradition's text, changed the same way. */
export const mapValues = (
  texts: Record<Nusach, string>,
  change: (text: string) => string,
): Record<Nusach, string> => ({
  ashkenazi: change(texts.ashkenazi),
  sephardi: change(texts.sephardi),
});

/** The names the header switch chooses between. */
export const switchNames = (id: string, form: (name: string) => string = shortName) =>
  mapValues(trope(id), form);

/** The switch's labels. */
export const NUSACH_LABELS: Record<Nusach, string> = { ashkenazi: 'אשכנזי', sephardi: 'ספרדי' };

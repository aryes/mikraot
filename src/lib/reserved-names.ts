/**
 * Names visitors may not comment under, so nobody can pose as the site's admin. (The admin badge
 * itself comes from the database and can't be faked; this guards the name next to it.)
 */

const RESERVED = ['מנהל האתר', 'מנהל', 'מנהלת', 'מקראות', 'admin', 'administrator', 'mikraot'];

/** Letters only, lower case: so spacing, punctuation, niqqud or case can't get around the list. */
const normalize = (name: string) =>
  name
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/[^\p{L}]/gu, '');

const reserved = new Set(RESERVED.map(normalize));

export const isReservedName = (name: string) => reserved.has(normalize(name));

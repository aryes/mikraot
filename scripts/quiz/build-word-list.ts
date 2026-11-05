/**
 * Makes the trope quiz's word list, public/quiz/trope-words.json, from the Torah as Sefaria gives
 * Miqra according to the Masorah: `npm run quiz:words`. The list is committed, so building the
 * site doesn't depend on Sefaria; run this again only to change what the list holds. Prints how
 * many words each trope has, the rare ones (below MIN_RANDOM) being asked only in prepared
 * questions (src/data/quiz/prepared.json).
 */
import { writeFileSync } from 'node:fs';
import { MIN_RANDOM, QUIZ_TROPES, type QuizItem, type WordList } from '../../src/lib/trope-quiz';
import { hasTwoSets, spread, verseItems } from './torah-words';

const BOOKS = { Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34 };
/** Enough that a learner rarely meets a word twice, small enough to load quickly. */
const PER_TROPE = 200;
const OUT = 'public/quiz/trope-words.json';

interface Version {
  versionTitle: string;
  license: string;
  text: string[];
}

/** The chapter's one version, from Sefaria's answer (checked: it comes from outside). */
function versionOf(body: unknown, url: string): Version {
  const versions: unknown = body && typeof body === 'object' ? Reflect.get(body, 'versions') : null;
  const first: unknown = Array.isArray(versions) ? versions[0] : null;
  const field = (name: string): unknown =>
    first && typeof first === 'object' ? Reflect.get(first, name) : undefined;
  const [versionTitle, license, text] = [field('versionTitle'), field('license'), field('text')];
  if (
    typeof versionTitle !== 'string' ||
    typeof license !== 'string' ||
    !Array.isArray(text) ||
    !text.every((verse) => typeof verse === 'string')
  ) {
    throw new Error(`${url}: not the expected text`);
  }
  return { versionTitle, license, text };
}

const found = new Map<string, QuizItem[]>();
let version = { title: '', license: '' };
for (const [book, chapters] of Object.entries(BOOKS)) {
  for (let chapter = 1; chapter <= chapters; chapter++) {
    const url = `https://www.sefaria.org/api/v3/texts/${book}.${chapter}?version=hebrew`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const text = versionOf(await res.json(), url);
    version = { title: text.versionTitle, license: text.license };
    text.text.forEach((html, i) => {
      if (hasTwoSets(`${book} ${chapter}:${i + 1}`)) return;
      for (const { trope, item } of verseItems(html)) {
        const items = found.get(trope) ?? [];
        // The same word shown twice would be the same question.
        if (!items.some((other) => other.w === item.w)) items.push(item);
        found.set(trope, items);
      }
    });
  }
}
if (version.title !== 'Miqra according to the Masorah') {
  throw new Error(`Sefaria's default text is now "${version.title}": check its licence first`);
}

// Sefaria gives the licence without its version; Wikisource, where MAM is edited, has published
// its text under CC BY-SA 4.0 since 2023.
const list: WordList = {
  source: 'מקרא על פי המסורה (Miqra according to the Masorah), via Sefaria',
  license: `${version.license} 4.0, https://creativecommons.org/licenses/by-sa/4.0/`,
  items: Object.fromEntries(QUIZ_TROPES.map((id) => [id, spread(found.get(id) ?? [], PER_TROPE)])),
};
writeFileSync(OUT, `${JSON.stringify(list)}\n`);
for (const id of QUIZ_TROPES) {
  const count = found.get(id)?.length ?? 0;
  console.log(`${id}: ${count}${count < MIN_RANDOM ? ' (prepared questions only)' : ''}`);
}
console.log(`Wrote ${OUT}`);

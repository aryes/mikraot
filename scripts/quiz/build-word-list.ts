/**
 * Makes the quizzes' word lists, public/quiz/trope-words.json, niqqud-words.json and
 * servant-words.json, from the Torah as Sefaria gives Miqra according to the Masorah:
 * `npm run quiz:words`. The lists are committed, so building the site doesn't depend on Sefaria;
 * run this again only to change what they hold. Prints how many words each entry has: one with
 * fewer than MIN_RANDOM is never drawn at random (the trope quiz asks about those in prepared
 * questions, src/data/quiz/prepared.json; the servant quiz leaves them out).
 */
import { writeFileSync } from 'node:fs';
import { QUIZ_VOWELS } from '../../src/lib/niqqud-quiz';
import { MIN_RANDOM, type QuizItem, type WordList } from '../../src/lib/quiz';
import { DISJUNCTIVES } from '../../src/lib/servant-quiz';
import { QUIZ_TROPES } from '../../src/lib/trope-quiz';
import { verseNiqqudItems } from './niqqud-words';
import { servantItems, versePairs, type Pair } from './servant-words';
import { hasTwoSets, spread, verseItems } from './torah-words';

const BOOKS = { Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34 };
/** Enough that a learner rarely meets a word twice, small enough to load quickly. */
const PER_ANSWER = 200;

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

/** The words found for each quiz, by answer. */
const tropes = new Map<string, QuizItem[]>();
const niqqud = new Map<string, QuizItem[]>();
const pairs: Pair[] = [];
const collect = (
  found: Map<string, QuizItem[]>,
  items: readonly { answer: string; item: QuizItem }[],
) => {
  for (const { answer, item } of items) {
    const list = found.get(answer) ?? [];
    // The same word shown twice would be the same question.
    if (!list.some((other) => other.w === item.w)) list.push(item);
    found.set(answer, list);
  }
};
let version = { title: '', license: '' };
for (const [book, chapters] of Object.entries(BOOKS)) {
  for (let chapter = 1; chapter <= chapters; chapter++) {
    const url = `https://www.sefaria.org/api/v3/texts/${book}.${chapter}?version=hebrew`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    const text = versionOf(await res.json(), url);
    version = { title: text.versionTitle, license: text.license };
    text.text.forEach((html, i) => {
      // Two sets of tropes, and in some words two vowels on a letter (one for each set).
      if (hasTwoSets(`${book} ${chapter}:${i + 1}`)) return;
      collect(tropes, verseItems(html));
      collect(niqqud, verseNiqqudItems(html));
      pairs.push(...versePairs(html));
    });
  }
}
if (version.title !== 'Miqra according to the Masorah') {
  throw new Error(`Sefaria's default text is now "${version.title}": check its licence first`);
}

// Sefaria gives the licence without its version; Wikisource, where MAM is edited, has published
// its text under CC BY-SA 4.0 since 2023.
function write(out: string, ids: readonly string[], found: Map<string, QuizItem[]>): void {
  const list: WordList = {
    source: 'מקרא על פי המסורה (Miqra according to the Masorah), via Sefaria',
    license: `${version.license} 4.0, https://creativecommons.org/licenses/by-sa/4.0/`,
    items: Object.fromEntries(ids.map((id) => [id, spread(found.get(id) ?? [], PER_ANSWER)])),
  };
  writeFileSync(out, `${JSON.stringify(list)}\n`);
  for (const id of ids) {
    const count = found.get(id)?.length ?? 0;
    console.log(`${id}: ${count}${count < MIN_RANDOM ? ' (not drawn at random)' : ''}`);
  }
  console.log(`Wrote ${out}`);
}
write('public/quiz/trope-words.json', QUIZ_TROPES, tropes);
write('public/quiz/niqqud-words.json', QUIZ_VOWELS, niqqud);
write('public/quiz/servant-words.json', DISJUNCTIVES, servantItems(pairs));

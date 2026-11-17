import React, { useEffect, useState } from 'react';
import type { Question, WordList } from '../lib/quiz';
import { WORD_SIGN_KIND, WORD_TROPES, wordFor } from '../lib/sign-words';
import { SIGN_KIND, SIGNED_TROPES, SIGNS } from '../lib/trope-signs';
import { trope } from '../lib/tropes';
import { isWordList, Quiz, type QuizConfig } from './Quiz';
import { Name } from './TropeQuiz';

/**
 * A trope's sign, large: what the learner chooses at the signs level. Kept on one line (קדמא ואזלא,
 * a פסק after its sign). The `sign` class sizes it in the options (`optionClass` below).
 */
const Sign: React.FC<{ id: string }> = ({ id }) => (
  <span className="sign text-4xl leading-[1.6] whitespace-nowrap">{SIGNS[id]}</span>
);

/** The trope quiz's words, fetched once for every option (the browser caches the file too). */
let words: Promise<WordList> | null = null;
const TROPE_WORDS = '/quiz/trope-words.json';

function useTropeWords(): WordList | 'failed' | null {
  const [list, setList] = useState<WordList | 'failed' | null>(null);
  useEffect(() => {
    words ??= fetch(TROPE_WORDS).then((res) => {
      if (!res.ok) throw new Error(`${TROPE_WORDS}: ${res.status}`);
      return res.json().then((data: unknown) => {
        if (!isWordList(data)) throw new Error(`${TROPE_WORDS}: not a word list`);
        return data;
      });
    });
    let current = true;
    words
      .then((loaded) => current && setList(loaded))
      .catch(() => {
        // Fetched again on the next visit to the quiz; meanwhile, the signs.
        words = null;
        if (current) setList('failed');
      });
    return () => {
      current = false;
    };
  }, []);
  return list;
}

/** Each question's own seed: new words for each round, the same while a question is shown. */
const seeds = new WeakMap<Question, string>();
function seedOf(question: Question): string {
  let seed = seeds.get(question);
  if (seed === undefined) {
    seed = String(Math.random());
    seeds.set(question, seed);
  }
  return seed;
}

/**
 * A word from the Torah carrying the trope `id`, chosen by `seed` (src/lib/sign-words.ts): "…"
 * while the words load, and the sign if they can't.
 */
const TropeWord: React.FC<{ id: string; seed: string }> = ({ id, seed }) => {
  const list = useTropeWords();
  if (list === 'failed') return <Sign id={id} />;
  const word =
    list &&
    wordFor(
      (list.items[id] ?? []).map((item) => item.w),
      seed,
    );
  return <span className="text-2xl leading-[1.6]">{word ?? '…'}</span>;
};

const wordOf = (id: string, question: Question) => (
  <TropeWord id={id} seed={`${seedOf(question)}|${id}`} />
);

/** The name without its sign, which would give the answer away. */
const asked = (question: Question) => <Name id={question.answer} unmarked />;

const CONFIG: QuizConfig = {
  kind: SIGN_KIND,
  wordList: '/quiz/trope-names.json',
  prepared: [],
  preparedCount: 0,
  storage: 'sign-quiz',
  event: 'sign-quiz',
  groups: SIGNED_TROPES,
  fewest: 1,
  prompt: () => 'מה הסימן של הטעם?',
  word: asked,
  // The options' signs 56px, so small marks (פשטא's, the תלישות', a פסק) tell apart (Arye,
  // 2026-11-17); 48px under 400px wide, where קדמא ואזלא and its ✓ or ✗ would overflow the button;
  // 36px elsewhere, beside words.
  optionClass: '[&_.sign]:text-5xl min-[25rem]:[&_.sign]:text-[3.5rem]',
  name: (id, _question, option) =>
    option ? (
      <Sign id={id} />
    ) : (
      <>
        <Name id={id} /> <Sign id={id} />
      </>
    ),
  // Or words from the Torah as the answers (Arye, 2026-11-15), chosen on the start screen: the
  // tropes the word list has enough words for.
  letter: {
    groups: WORD_TROPES,
    kind: WORD_SIGN_KIND,
    // The feedback names the trope, its sign on the name, without another word (Arye, 2026-11-16).
    name: (id, question, option) => (option ? wordOf(id, question) : <Name id={id} />),
    answerIs: 'הסימן הוא',
    choice: {
      heading: 'בתשובות',
      label: 'מה מופיע בתשובות',
      base: 'סימן על א',
      letter: 'מילה מהתורה',
    },
  },
  // A button's sign means nothing read aloud, nor a word's trope: each is numbered instead.
  optionLabel: (index) => `סימן ${index + 1}`,
  answerIs: 'הסימן של',
  more: (question) => (
    <a href={encodeURI(trope(question.answer).href)}>
      לדף הטעם <Name id={question.answer} />
    </a>
  ),
};

/**
 * The sign quiz ("סימן הטעם"; Arye, 2026-11-14: "find the trope sign given the trope name"): the
 * trope quiz turned around, rounds of ten trope names, four answers to choose from: signs on an
 * א (SIGNS, src/lib/trope-signs.ts); with a קמץ for יתיב and מהפך, which sit on either side of it
 * (Arye), and for their look-alikes (מונח, מונח לגרמיה, אתנחתא), so the vowel tells nothing; no
 * מאילא, on one letter a טפחא. Or, chosen on the start screen (Arye, 2026-11-15; the engine's
 * `letter` level, so a duel plays signs), words from the Torah, each carrying its trope
 * (src/lib/sign-words.ts). Shown on the page "סימן הטעם" through the Markdoc tag `sign-quiz`.
 */
export const SignQuiz: React.FC = () => <Quiz config={CONFIG} />;

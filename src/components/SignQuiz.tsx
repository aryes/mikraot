import React from 'react';
import { SIGN_KIND, SIGNED_TROPES, SIGNS } from '../lib/trope-signs';
import { trope } from '../lib/tropes';
import { Quiz, type QuizConfig } from './Quiz';
import { Name } from './TropeQuiz';

/** A trope's sign, large: what the learner chooses. */
const Sign: React.FC<{ id: string }> = ({ id }) => (
  <span className="text-4xl leading-[1.6]">{SIGNS[id]}</span>
);

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
  // The name without its sign, which would give the answer away.
  word: (question) => <Name id={question.answer} unmarked />,
  name: (id, _question, option) =>
    option ? (
      <Sign id={id} />
    ) : (
      <>
        <Name id={id} /> <Sign id={id} />
      </>
    ),
  // A button's sign means nothing read aloud: each is numbered instead.
  optionLabel: (index) => `סימן ${index + 1}`,
  answerIs: 'הסימן של',
  more: (question) => (
    <a href={encodeURI(trope(question.answer).href)}>
      לדף הטעם <Name id={question.answer} />
    </a>
  ),
};

/**
 * The sign quiz ("מה הסימן?"; Arye, 2026-11-14: "find the trope sign given the trope name"): the
 * trope quiz turned around, rounds of ten trope names, four signs to choose from, each on an א
 * (SIGNS, src/lib/trope-signs.ts); with a קמץ for יתיב and מהפך, which sit on either side of it
 * (Arye), and for their look-alikes (מונח, מונח לגרמיה, אתנחתא), so the vowel tells nothing. No
 * מאילא: on one letter its sign is a טפחא's. Shown on the page "מה הסימן?" through the Markdoc tag
 * `sign-quiz`.
 */
export const SignQuiz: React.FC = () => <Quiz config={CONFIG} />;

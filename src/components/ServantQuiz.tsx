import React from 'react';
import { SERVANT_QUIZ } from '../lib/servant-quiz';
import { trope } from '../lib/tropes';
import { Quiz, type QuizConfig } from './Quiz';
import { Name } from './TropeQuiz';

const CONFIG: QuizConfig = {
  kind: SERVANT_QUIZ,
  wordList: '/quiz/servant-words.json',
  prepared: [],
  preparedCount: 0,
  storage: 'servant-quiz',
  event: 'servant-quiz',
  prompt: () => 'איזה משרת חסר במילה המסומנת?',
  // Smaller on a phone, so the two words stay side by side: servant, then the disjunctive.
  wordSize: 'text-4xl sm:text-5xl',
  // Each name with its sign, in the buttons too (Arye, 2026-11-14): the learner matches the sign.
  name: (id) => <Name id={id} />,
  answerIs: 'המשרת כאן:',
  // The link takes the content's link style (.wp-content-rendered a).
  more: (question) => (
    <a href={encodeURI(trope(question.answer).href)}>
      לדף הטעם <Name id={question.answer} />
    </a>
  ),
};

/**
 * The servant quiz (src/lib/servant-quiz.ts): rounds of ten pairs of words from the Torah, the
 * first without its servant; four servant names to choose from. Shown on the page "זיהוי משרתים"
 * through the Markdoc tag `servant-quiz`.
 */
export const ServantQuiz: React.FC = () => <Quiz config={CONFIG} />;

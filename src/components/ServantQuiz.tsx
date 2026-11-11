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
  // In a button only the name: the sign would show what is missing from the word.
  name: (id, _question, option) => <Name id={id} unmarked={option} />,
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
 * first without its servant; four servant names to choose from. Shown on the page "איזה משרת?"
 * through the Markdoc tag `servant-quiz`.
 */
export const ServantQuiz: React.FC = () => <Quiz config={CONFIG} />;

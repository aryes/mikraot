import React from 'react';
import { vowelName } from '../lib/niqqud-quiz';
import {
  SHVA_GROUPS,
  SHVA_KINDS,
  SHVA_PAGE,
  SHVA_PER_GROUP,
  SHVA_QUIZ,
  shvaKind,
  shvaReason,
} from '../lib/shva-quiz';
import { Quiz, type QuizConfig } from './Quiz';

const CONFIG: QuizConfig = {
  kind: SHVA_QUIZ,
  wordList: '/quiz/shva-words.json',
  prepared: [],
  preparedCount: 0,
  storage: 'shva-quiz',
  event: 'shva-quiz',
  // Five of each kind in a round of ten, every rule among them.
  groups: SHVA_GROUPS,
  answerOf: shvaKind,
  perGroup: SHVA_PER_GROUP,
  options: SHVA_KINDS,
  prompt: () => 'איזה שווא מסומן כאן?',
  // In the feedback only "נע" or "נח", after "השווא כאן:".
  name: (id, _question, option) => (option ? vowelName(id) : vowelName(id).replace('שווא ', '')),
  answerIs: 'השווא כאן:',
  // Its rule, after every answer: "למה נע? בראש מילה."
  explain: (question) => shvaReason(question.group),
  // The link takes the content's link style (.wp-content-rendered a).
  more: () => <a href={encodeURI(SHVA_PAGE)}>לדף על שווא נע</a>,
};

/**
 * The shva quiz (src/lib/shva-quiz.ts): rounds of ten words from the Torah, a shva marked in each;
 * נע or נח? Shown on the page "שווא נע או נח?" through the Markdoc tag `shva-quiz`.
 */
export const ShvaQuiz: React.FC = () => <Quiz config={CONFIG} />;

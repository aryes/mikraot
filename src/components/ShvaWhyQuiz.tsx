import React from 'react';
import { NA_GROUPS, NA_RULES, SHVA_PAGE, SHVA_WHY_QUIZ } from '../lib/shva-quiz';
import { Quiz, type QuizConfig } from './Quiz';

const CONFIG: QuizConfig = {
  kind: SHVA_WHY_QUIZ,
  wordList: '/quiz/shva-words.json',
  prepared: [],
  preparedCount: 0,
  storage: 'shva-why-quiz',
  event: 'shva-why-quiz',
  // Only the שווא נע words, two by each rule in a round of ten; four of the five rules offered,
  // never another that applies to the word too.
  groups: NA_GROUPS,
  perGroup: 2,
  prompt: () => 'למה השווא המסומן נע?',
  name: (id) => NA_RULES[id] ?? id,
  answerIs: 'הכלל כאן:',
  // The other rules that make it נע too, as the page gives them (בְּכוֹר: בראש מילה, באות דגושה).
  explain: (question) => {
    const also = (question.item.x ?? []).map((rule) => NA_RULES[rule]).filter(Boolean);
    return also.length > 0 ? `ונע גם מפני שהוא: ${also.join('; ')}.` : undefined;
  },
  // The link takes the content's link style (.wp-content-rendered a).
  more: () => <a href={encodeURI(SHVA_PAGE)}>לכללי השווא הנע</a>,
};

/**
 * The "why" shva quiz (NA_RULES in src/lib/shva-quiz.ts): rounds of ten words from the Torah, a
 * שווא נע marked in each; which of the five rules of the page "שווא נע" makes it נע? Shown on the
 * page "למה השווא נע" through the Markdoc tag `shva-why`.
 */
export const ShvaWhyQuiz: React.FC = () => <Quiz config={CONFIG} />;

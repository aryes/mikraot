import React from 'react';
import {
  DAGESH_GROUPS,
  DAGESH_KINDS,
  DAGESH_PAGE,
  DAGESH_STRONG_PAGE,
  DAGESH_PER_GROUP,
  DAGESH_QUIZ,
  DAGESH_REASONS,
  dageshKind,
} from '../lib/dagesh-quiz';
import { Quiz, type QuizConfig } from './Quiz';

const CONFIG: QuizConfig = {
  kind: DAGESH_QUIZ,
  wordList: '/quiz/dagesh-words.json',
  prepared: [],
  preparedCount: 0,
  storage: 'dagesh-quiz',
  event: 'dagesh-quiz',
  // Five of each kind in a round of ten, every rule among them.
  groups: DAGESH_GROUPS,
  answerOf: dageshKind,
  perGroup: DAGESH_PER_GROUP,
  options: DAGESH_KINDS,
  prompt: () => 'איזה דגש מסומן כאן?',
  // "דגש חזק" in a button; in the feedback only "חזק" or "קל", after "הדגש כאן:".
  name: (id, _question, option) => (option ? id.replace('-', ' ') : id.replace('דגש-', '')),
  answerIs: 'הדגש כאן:',
  // Its rule, after every answer: "למה קל? בג״ד כפ״ת אחרי שווא נח."
  explain: (question) => DAGESH_REASONS[question.group],
  // To the answer's page; the link takes the content's link style (.wp-content-rendered a).
  more: (question) =>
    question.answer === 'דגש-קל' ? (
      <a href={encodeURI(DAGESH_PAGE)}>לדף על דגש קל</a>
    ) : (
      <a href={encodeURI(DAGESH_STRONG_PAGE)}>לדף על דגש חזק</a>
    ),
};

/**
 * The dagesh quiz (src/lib/dagesh-quiz.ts): rounds of ten words from the Torah, a dagesh marked
 * in each; חזק or קל? Shown on the page "דגש חזק או קל" through the Markdoc tag `dagesh-quiz`.
 */
export const DageshQuiz: React.FC = () => <Quiz config={CONFIG} />;

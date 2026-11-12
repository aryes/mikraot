import React from 'react';
import { QAMATS_KINDS, QAMATS_PAGE, QAMATS_QUIZ, vowelName } from '../lib/niqqud-quiz';
import { Quiz, type QuizConfig } from './Quiz';

const CONFIG: QuizConfig = {
  kind: QAMATS_QUIZ,
  wordList: '/quiz/qamats-words.json',
  prepared: [],
  preparedCount: 0,
  storage: 'qamats-quiz',
  event: 'qamats-quiz',
  // Two kinds: five of each in a round of ten (the קמץ קטן is rare in the text, not in the quiz).
  perGroup: 5,
  options: QAMATS_KINDS,
  prompt: () => 'איזה קמץ מסומן כאן?',
  // In the feedback only "גדול" or "קטן", after "הקמץ כאן:".
  name: (id, _question, option) => (option ? vowelName(id) : vowelName(id).replace('קמץ ', '')),
  answerIs: 'הקמץ כאן:',
  // The link takes the content's link style (.wp-content-rendered a).
  more: () => <a href={encodeURI(QAMATS_PAGE)}>לדף על קמץ קטן</a>,
};

/**
 * The qamats quiz (src/lib/niqqud-quiz.ts): rounds of ten words from the Torah, a qamats marked
 * in each, the cantillation kept; a קמץ גדול or a קמץ קטן? Shown on the page "קמץ גדול או קטן?"
 * through the Markdoc tag `qamats-quiz`.
 */
export const QamatsQuiz: React.FC = () => <Quiz config={CONFIG} />;

import React from 'react';
import { NIQQUD_PAGE, NIQQUD_QUIZ, QUIZ_VOWELS, vowelName } from '../lib/niqqud-quiz';
import { Quiz, type QuizConfig } from './Quiz';

const CONFIG: QuizConfig = {
  kind: NIQQUD_QUIZ,
  wordList: '/quiz/niqqud-words.json',
  // None yet: every niqqud is common enough to draw at random.
  prepared: [],
  preparedCount: 0,
  storage: 'niqqud-quiz',
  // Not the word list's קמץ קטן, which only the vowel-class quiz asks about: its sign is a קמץ's.
  groups: QUIZ_VOWELS,
  event: 'niqqud-quiz',
  prompt: () => 'איזה ניקוד מסומן כאן?',
  name: (id) => vowelName(id),
  answerIs: 'הניקוד כאן:',
  // The link takes the content's link style (.wp-content-rendered a).
  more: () => <a href={encodeURI(NIQQUD_PAGE)}>לטבלת הניקוד</a>,
};

/**
 * The niqqud quiz (src/lib/niqqud-quiz.ts): rounds of ten words from the Torah, one letter of
 * each marked, four niqqud names to choose from. Shown on the page "מה הניקוד?" through the
 * Markdoc tag `niqqud-quiz`.
 */
export const NiqqudQuiz: React.FC = () => <Quiz config={CONFIG} />;

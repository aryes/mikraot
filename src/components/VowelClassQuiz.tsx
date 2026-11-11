import React from 'react';
import type { Question } from '../lib/quiz';
import {
  NIQQUD_PAGE,
  VOWEL_CLASS_OF,
  VOWEL_CLASS_QUIZ,
  VOWEL_CLASSES,
  vowelName,
} from '../lib/niqqud-quiz';
import { Quiz, type QuizConfig } from './Quiz';

/** The vowel the question was drawn from, named after the class in the feedback. */
const withVowel = (id: string, question: Question) =>
  id === question.answer ? `${id} (${vowelName(question.group)})` : id;

const CONFIG: QuizConfig = {
  kind: VOWEL_CLASS_QUIZ,
  wordList: '/quiz/niqqud-words.json',
  prepared: [],
  preparedCount: 0,
  storage: 'vowel-class-quiz',
  event: 'vowel-class-quiz',
  // Every niqqud of the list but the שווא (VOWEL_CLASS_OF); each asked about its class.
  groups: Object.keys(VOWEL_CLASS_OF),
  answerOf: (group) => VOWEL_CLASS_OF[group] ?? '',
  options: VOWEL_CLASSES,
  prompt: () => 'מה סוג התנועה המסומנת?',
  nameRight: true,
  // The feedback names the vowel too, after a right answer as well: "גדולה (קמץ)".
  name: (id, question, option) => (option ? id : withVowel(id, question)),
  answerIs: 'התנועה כאן:',
  more: () => <a href={encodeURI(NIQQUD_PAGE)}>לטבלת הניקוד</a>,
};

/**
 * The vowel-class quiz (src/lib/niqqud-quiz.ts): rounds of ten words from the Torah, one letter
 * of each marked; is its vowel long, short or hataf? Shown on the page "גדולה, קטנה או חטופה?"
 * through the Markdoc tag `vowel-classes` (one hyphen: the Markdoc integration makes an identifier of it, replacing only the first).
 */
export const VowelClassQuiz: React.FC = () => <Quiz config={CONFIG} />;

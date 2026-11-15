import React from 'react';
import {
  QAMATS_PAGE,
  QAMATS_WHY_QUIZ,
  QATAN_GROUPS,
  QATAN_PER_GROUP,
  QATAN_REASONS,
  QATAN_RULES,
} from '../lib/niqqud-quiz';
import { Quiz, type QuizConfig } from './Quiz';

const CONFIG: QuizConfig = {
  kind: QAMATS_WHY_QUIZ,
  wordList: '/quiz/qamats-words.json',
  prepared: [],
  preparedCount: 0,
  storage: 'qamats-why-quiz',
  event: 'qamats-why-quiz',
  // Only the קמץ קטן words, every rule in every round; the options drawn from the four rules,
  // never another that applies to the word too.
  groups: QATAN_GROUPS,
  perGroup: QATAN_PER_GROUP,
  // The rules of the דגש and of the two qamats have few words in the Torah (under MIN_RANDOM):
  // asked all the same, their words come back more often.
  fewest: 1,
  prompt: () => 'למה הקמץ המסומן קטן?',
  name: (id) => QATAN_RULES[id] ?? id,
  answerIs: 'הכלל כאן:',
  // The rule in full, as the page and the qamats quiz say it; and any other that applies too.
  explain: (question) => {
    const also = (question.item.x ?? []).map((rule) => QATAN_RULES[rule]).filter(Boolean);
    const reason = QATAN_REASONS[question.answer] ?? '';
    return also.length > 0 ? `${reason} וקטן גם מפני שהוא: ${also.join('; ')}.` : reason;
  },
  // The link takes the content's link style (.wp-content-rendered a).
  more: () => <a href={encodeURI(QAMATS_PAGE)}>לכללי הקמץ הקטן</a>,
};

/**
 * The "why" qamats quiz (QATAN_RULES in src/lib/niqqud-quiz.ts): rounds of ten words from the
 * Torah, a קמץ קטן marked in each, the cantillation kept; which of the four rules of the page "קמץ
 * קטן" makes it קטן? Shown on the page "למה הקמץ קטן?" through the Markdoc tag `qamats-why`.
 */
export const QamatsWhyQuiz: React.FC = () => <Quiz config={CONFIG} />;

import React from 'react';
import prepared from '../data/quiz/prepared.json';
import type { Question } from '../lib/quiz';
import { rankOf, TROPE_QUIZ } from '../lib/trope-quiz';
import { PASEQ, switchNames, trope, unmarkedName } from '../lib/tropes';
import { pieces, Quiz, type QuizConfig } from './Quiz';

/** The page whose sections the ranks are named after. */
const HIERARCHY = '/trope-hierarchy/';

/**
 * A trope's name in every tradition, CSS showing the reader's (as NusachText.astro does); with
 * its sign on it unless `unmarked`.
 */
const Name: React.FC<{ id: string; unmarked?: boolean | undefined }> = ({ id, unmarked }) => {
  const { ashkenazi, sephardi } = switchNames(id, unmarked ? unmarkedName : undefined);
  if (ashkenazi === sephardi) return <>{ashkenazi}</>;
  return (
    <>
      <span className="nusach-ashkenazi">{ashkenazi}</span>
      <span className="nusach-sephardi">{sephardi}</span>
    </>
  );
};

/**
 * An option's name, and the right answer's in the feedback. Where the word's line is a פסק, the
 * answer says so ("מונח עם פסיק"; Arye, 2026-11-09): the trope alone would leave the line
 * unexplained. The פסק without its line, so it can't be read as a מונח לגרמיה's.
 */
const AnswerName: React.FC<{ id: string; question: Question; unmarked?: boolean | undefined }> = ({
  id,
  question,
  unmarked,
}) => (
  <>
    <Name id={id} unmarked={unmarked} />
    {question.item.p && id === question.answer && (
      <>
        {' עם '}
        <Name id={PASEQ} unmarked />
      </>
    )}
  </>
);

/** An explanation, its `{id}` placeholders shown as names. */
const Why: React.FC<{ text: string }> = ({ text }) => (
  <>
    {pieces(text.split(/\{([^}]+)\}/), 1).map((piece) =>
      piece.index % 2 ? (
        <Name key={piece.at} id={piece.text} />
      ) : (
        <React.Fragment key={piece.at}>{piece.text}</React.Fragment>
      ),
    )}
  </>
);

const CONFIG: QuizConfig = {
  kind: TROPE_QUIZ,
  wordList: '/quiz/trope-words.json',
  prepared,
  preparedCount: 2,
  storage: 'trope-quiz',
  event: 'trope-quiz',
  prompt: (question) =>
    question.item.m === undefined ? 'איזה טעם מופיע כאן?' : 'איזה טעם מופיע במילה המסומנת?',
  // In a button only the name: the sign on it would give the answer away (Arye, 2026-11-06).
  name: (id, question, option) => <AnswerName id={id} question={question} unmarked={option} />,
  answerIs: 'הטעם כאן:',
  why: (text) => <Why text={text} />,
  // The link takes the content's link style (.wp-content-rendered a).
  more: (question) => (
    <a href={encodeURI(trope(question.answer).href)}>
      לדף הטעם <Name id={question.answer} />
    </a>
  ),
  result: (score, size) => {
    const rank = rankOf(score, size);
    return (
      <>
        {/* The rank links to its place in the trope hierarchy: the score teaches too. */}
        <div className="text-lg">
          הדרגה שלכם:{' '}
          <a href={`${HIERARCHY}#${rank.anchor}`} className="font-bold">
            {rank.name}
          </a>
        </div>
        <div>{rank.line}</div>
      </>
    );
  },
};

/**
 * The trope quiz (src/lib/trope-quiz.ts): rounds of ten words from the Torah, four trope names to
 * choose from for each. Shown on the page "מה הטעם?" through the Markdoc tag `trope-quiz`.
 */
export const TropeQuiz: React.FC = () => <Quiz config={CONFIG} />;

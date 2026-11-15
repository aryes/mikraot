import React from 'react';
import times from '../data/quiz/sound-times.json';
import type { Question } from '../lib/quiz';
import {
  RECORDINGS_DIR,
  SOUND_PAGE,
  SOUND_QUIZ,
  SOUNDS,
  recordingOf,
  soundLabel,
} from '../lib/sound-quiz';
import { Quiz, type QuizConfig } from './Quiz';

const TIMES: Readonly<Record<string, readonly (readonly number[])[]>> = times;

/** Made on the first listen (a browser starts sound only after a press). */
let context: AudioContext | null = null;
/** Each recording, fetched and decoded once. */
const decoded = new Map<string, Promise<AudioBuffer>>();
/** The syllable playing, stopped when another starts. */
let playing: AudioBufferSourceNode | null = null;

function recording(audio: AudioContext, name: string): Promise<AudioBuffer> {
  let buffer = decoded.get(name);
  if (!buffer) {
    buffer = fetch(encodeURI(`${RECORDINGS_DIR}${name}.mp3`))
      .then((res) => {
        if (!res.ok) throw new Error(`${name}.mp3: ${res.status}`);
        return res.arrayBuffer();
      })
      .then((data) => audio.decodeAudioData(data));
    // A failed fetch is tried again on the next press.
    buffer.catch(() => decoded.delete(name));
    decoded.set(name, buffer);
  }
  return buffer;
}

/**
 * One syllable of the letter's recording, by its times: played from the decoded recording (Web
 * Audio), which starts and stops on the exact sample. An audio element with `#t=start,end` stops
 * only up to a quarter of a second late, into the next syllable: the very sound to tell apart.
 */
function play(id: string, question: Question): void {
  const name = recordingOf(question.item.w);
  const span = name && TIMES[name]?.[SOUNDS.findIndex((sound) => sound === id)];
  if (!name || !span) return;
  const [from = 0, to = 0] = span;
  context ??= new AudioContext();
  const audio = context;
  // Resumed in the press itself: Safari keeps a context made earlier suspended.
  audio.resume().catch(() => undefined);
  playing?.stop();
  playing = null;
  recording(audio, name)
    .then((buffer) => {
      playing?.stop();
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.connect(audio.destination);
      source.start(0, from, to - from);
      playing = source;
    })
    // A failed fetch or decode just stays silent: the learner can press again.
    .catch(() => undefined);
}

const CONFIG: QuizConfig = {
  kind: SOUND_QUIZ,
  wordList: '/quiz/sound-letters.json',
  prepared: [],
  preparedCount: 0,
  storage: 'sound-quiz',
  event: 'sound-quiz',
  // Two of each sound in a round of ten.
  groups: SOUNDS,
  perGroup: 2,
  options: SOUNDS,
  listen: { label: soundLabel, play },
  untimed: true,
  prompt: () => 'איך קוראים את זה?',
  // Not shown: the options are named by their place (listen.label).
  name: (id) => id,
  answerIs: 'הנכון:',
  // The link takes the content's link style (.wp-content-rendered a).
  more: () => <a href={encodeURI(SOUND_PAGE)}>לדף המבטא, ובו כל ההקלטות</a>,
};

/**
 * The sound quiz (src/lib/sound-quiz.ts): rounds of ten letters, each written with a vowel; which
 * of the letter's five recorded syllables is it? Shown on the page "איך זה נשמע?" through the
 * Markdoc tag `sound-quiz`.
 */
export const SoundQuiz: React.FC = () => <Quiz config={CONFIG} />;

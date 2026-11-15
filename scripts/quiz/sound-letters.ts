/**
 * Makes the sound quiz's lists from the מבטא page's recordings: `npm run quiz:sounds`.
 * - src/data/quiz/sound-times.json: each recording's five syllables, as the seconds to play each
 *   by (found from its loudness, scripts/quiz/syllables.ts), bundled with the quiz.
 * - public/quiz/sound-letters.json: the quiz's word list, each letter written with each sound
 *   (soundForms in src/lib/sound-quiz.ts), fetched when the quiz opens.
 * Both are committed; run this again only if the recordings or the forms change. The recordings
 * are decoded in a browser (Playwright's Chromium, the browser tests' own), which reads MP3.
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import type { QuizItem, WordList } from '../../src/lib/quiz';
import {
  RECORDINGS,
  RECORDINGS_DIR,
  SOUNDS,
  soundForms,
  type Sound,
} from '../../src/lib/sound-quiz';
import { syllables } from './syllables';

/** Loudness is measured in frames this long (seconds). */
const FRAME = 0.01;

const browser = await chromium.launch();
const page = await browser.newPage();
const times: Record<string, [number, number][]> = {};
for (const name of Object.keys(RECORDINGS)) {
  const mp3 = readFileSync(`public${RECORDINGS_DIR}${name}.mp3`).toString('base64');
  // oxlint-disable-next-line no-await-in-loop -- one recording at a time, in one page
  const loudness = await page.evaluate(
    async ([data, frame]) => {
      const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
      const audio = await new OfflineAudioContext(1, 1, 44_100).decodeAudioData(bytes.buffer);
      const samples = audio.getChannelData(0);
      const step = Math.round(audio.sampleRate * frame);
      const out: number[] = [];
      for (let i = 0; i < samples.length; i += step) {
        let sum = 0;
        for (let j = i; j < Math.min(i + step, samples.length); j++) sum += (samples[j] ?? 0) ** 2;
        out.push(Math.sqrt(sum / step));
      }
      return out;
    },
    [mp3, FRAME] as const,
  );
  const found = syllables(loudness, FRAME, SOUNDS.length);
  if (!found) throw new Error(`${name}.mp3: not ${SOUNDS.length} syllables`);
  times[name] = found;
  console.log(name, found.map(([from, to]) => `${from}-${to}`).join(' '));
}
await browser.close();

const items: Record<Sound, QuizItem[]> = { a: [], e: [], i: [], o: [], u: [] };
for (const letter of Object.values(RECORDINGS)) {
  const forms = soundForms(letter);
  for (const sound of SOUNDS) items[sound].push(...forms[sound].map((w) => ({ w })));
}
const list: WordList = {
  source: 'Mikraot, the letters and vowels of its page מבטא',
  license: 'CC BY-NC-SA 4.0, https://creativecommons.org/licenses/by-nc-sa/4.0/',
  items,
};
writeFileSync('src/data/quiz/sound-times.json', `${JSON.stringify(times, null, 2)}\n`);
writeFileSync('public/quiz/sound-letters.json', JSON.stringify(list));
for (const sound of SOUNDS) console.log(sound, items[sound].length);

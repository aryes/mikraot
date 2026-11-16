import { expect, test } from '@playwright/test';
import { CHEERS, MISSES, NEAR_MISSES } from '../src/lib/quiz';
import { RECORDINGS_DIR, recordingOf } from '../src/lib/sound-quiz';

const QUIZ = `/${encodeURI('איך-זה-נשמע')}/`;
const LABELS = ['צליל 1', 'צליל 2', 'צליל 3', 'צליל 4', 'צליל 5'];

test('the sound quiz runs a round of ten, each letter with five syllables to hear', async ({
  page,
}) => {
  const fetched = new Set<string>();
  page.on('request', (request) => fetched.add(decodeURI(new URL(request.url()).pathname)));
  await page.goto(QUIZ);
  const quiz = page.locator('astro-island .not-prose');
  await quiz.scrollIntoViewIfNeeded();
  // No time limit to choose: hearing five syllables takes longer than any.
  await expect(quiz).not.toContainText('זמן לכל שאלה');
  await quiz.getByRole('button', { name: 'להתחיל' }).click();
  const listen = quiz.getByRole('button', { name: /^להשמיע את צליל \d$/ });
  const options = quiz.getByRole('button', { name: /^צליל \d$/ });
  const next = quiz.getByRole('button', { name: /לשאלה הבאה|לתוצאה/ });

  /* oxlint-disable no-await-in-loop -- one question after another */
  for (let i = 1; i <= 10; i++) {
    await expect(quiz).toContainText(`שאלה ${i} מתוך 10`);
    // Five options named by their place, each with a button to hear it; no time limit.
    await expect(quiz.getByRole('timer')).toHaveCount(0);
    await expect(options).toHaveText(LABELS);
    await expect(listen).toHaveCount(5);
    const written = (await quiz.locator('[tabindex="-1"]').innerText()).trim();
    const name = recordingOf(written);
    expect(name, written).toBeDefined();
    // Listening fetches that letter's recording (once: later plays use it decoded).
    await listen.nth(i % 5).click();
    await expect.poll(() => fetched.has(`${RECORDINGS_DIR}${name ?? ''}.mp3`)).toBe(true);
    await options.first().click();
    const feedback = (await quiz.locator('[aria-live] p').first().innerText()).trim();
    const [opening = '', rest] = feedback.split(' הנכון: ');
    expect(rest === undefined ? CHEERS : [...NEAR_MISSES, ...MISSES]).toContain(opening);
    // The feedback names the option marked right, by its place.
    const right = (await quiz.locator('button.quiz-pop').innerText()).trim();
    if (rest !== undefined) expect(rest).toBe(right);
    else expect(right).toBe(LABELS[0]);
    // And its speaker is marked too, to hear it again.
    await expect(quiz.getByRole('button', { name: `להשמיע את ${right}` })).toHaveClass(
      /border-green-700/,
    );
    await expect(quiz.getByRole('link', { name: 'לדף המבטא, ובו כל ההקלטות' })).toBeVisible();
    await expect(next).toBeFocused();
    await next.click();
  }
  /* oxlint-enable no-await-in-loop */

  await expect(quiz.getByRole('status')).toContainText(/זיהיתם נכון \d+ מתוך 10/);
  // Two of each sound: its memory's keys start with the sound.
  const recent: string[] = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('sound-quiz-recent') ?? '[]'),
  );
  expect(recent).toHaveLength(10);
  for (const sound of ['a', 'e', 'i', 'o', 'u']) {
    expect(recent.filter((key) => key.startsWith(`${sound}|`))).toHaveLength(2);
  }
});

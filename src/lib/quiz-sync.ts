/**
 * Quiz results in the learner's account (src/server/quiz-results.ts), for a browser signed in
 * (src/lib/account.ts). Signed out, a quiz saves its results in the browser only
 * (`<quiz>-stats`, as before accounts); signed in, in the account (Arye, 2026-11-21: the two never
 * mix, since a shared computer's anonymous results may be someone else's). Signed in, the browser
 * keeps what it played (`<quiz>-stats-account`, its row in the account) and the account's other
 * devices' (`<quiz>-stats-others`), and the quizzes show the two added together (`resultsOf`).
 * Each sync sends this browser's row whole, under its own name (`device`): the account replaces
 * it, so nothing is counted twice. Signing out clears both; the anonymous results show again.
 */
import { remember, signedInHere } from './account';
import { addStats, emptyStats, readStats, type QuizStats } from './quiz-stats';
import { quizKeys, store, stored } from './quiz-storage';
import { QUIZ_STORAGE } from './quizzes';

const API = '/api/quiz-results/';
/** This browser's name in the account: random, made once. */
const DEVICE_KEY = 'device';
/** The latest reset of each quiz this browser has seen (the account's time). */
const SEEN_KEY = 'quiz-resets-seen';
/** Quizzes cleared here whose reset the account hasn't confirmed yet. */
const PENDING_KEY = 'quiz-resets-pending';
/** Fired on `document` when the account's results have arrived. */
export const SYNCED_EVENT = 'quiz-results-synced';

/** The account's own rows: kept whole, whatever answers they name. */
const any = () => true;
const QUIZZES = Object.values(QUIZ_STORAGE).map((quiz) => quiz.storage);
const othersKey = (quiz: string) => `${quizKeys(quiz).stats}-others`;
const accountKey = (quiz: string) => `${quizKeys(quiz).stats}-account`;

/** Where a quiz saves this browser's results now: in its row of the account if signed in. */
export const ownKey = (quiz: string): string =>
  signedInHere() ? accountKey(quiz) : quizKeys(quiz).stats;

/** The account's other devices' results of a quiz, as last heard (none if not signed in). */
export const othersOf = (quiz: string, known: (id: string) => boolean): QuizStats =>
  signedInHere() ? readStats(stored(othersKey(quiz)), known) : emptyStats();

/** What the learner sees: this browser's results now, and the account's other devices'. */
export const resultsOf = (quiz: string, known: (id: string) => boolean): QuizStats =>
  addStats(readStats(stored(ownKey(quiz)), known), othersOf(quiz, known));

function device(): string {
  const saved = stored(DEVICE_KEY);
  if (typeof saved === 'string' && /^[\w-]{22}$/.test(saved)) return saved;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const made = btoa(String.fromCodePoint(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .slice(0, 22);
  store(DEVICE_KEY, made);
  return made;
}

/**
 * The latest reset of each quiz this browser has seen in the account it syncs with ('' for none),
 * or null before its first sync since signing in: then it takes its row back from the account
 * before sending anything. Forgotten on signing out.
 */
function seenResets(): Record<string, string> | null {
  const saved = stored(SEEN_KEY);
  if (!saved || typeof saved !== 'object') return null;
  return Object.fromEntries(
    Object.entries(saved).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

/** Resets not yet confirmed by the account: kept, so one made offline is sent later. */
function pendingResets(): string[] {
  const saved = stored(PENDING_KEY);
  return Array.isArray(saved) ? saved.filter((q): q is string => QUIZZES.includes(String(q))) : [];
}

let running: Promise<void> | undefined;
let again = false;
/** Passes of one sync at most: a reset seen sends again once; storage that fails can't loop. */
const MAX_PASSES = 3;

/**
 * Sends this browser's results and takes the account's, if signed in here; otherwise nothing.
 * `reset`: quizzes the learner just cleared (on every device). One sync at a time; a call during
 * one runs once more after it. Failures are quiet: the results stay here and go with the next.
 */
export function syncResults(reset: readonly string[] = []): Promise<void> {
  if (!signedInHere()) return Promise.resolve();
  if (reset.length > 0) store(PENDING_KEY, [...new Set([...pendingResets(), ...reset])]);
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    let passes = 0;
    do {
      again = false;
      passes += 1;
      // One after another: each sends what the one before it changed.
      // oxlint-disable-next-line eslint/no-await-in-loop
      await syncOnce().catch(() => undefined);
    } while (again && passes < MAX_PASSES);
    running = undefined;
  })();
  return running;
}

async function syncOnce(): Promise<void> {
  const known = seenResets();
  const seen = known ?? {};
  const reset = pendingResets();
  const quizzes = Object.fromEntries(
    QUIZZES.map((quiz) => [
      quiz,
      { stats: stored(accountKey(quiz)), seen: known ? (seen[quiz] ?? '') : null },
    ]),
  );
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ device: device(), quizzes, reset }),
  });
  if (res.status === 401) {
    // Signed out elsewhere (or the session ran out): as after signing out here.
    remember(null);
    forgetAccountResults();
    return;
  }
  if (!res.ok) throw new Error(`quiz results: ${res.status}`);
  // Signed out meanwhile: nothing of the account comes back into this browser.
  if (!signedInHere()) return;
  // Confirmed: those resets are done (any made meanwhile stay pending).
  store(
    PENDING_KEY,
    pendingResets().filter((quiz) => !reset.includes(quiz)),
  );
  const answer: unknown = await res.json();
  if (!signedInHere()) return;
  // Another tab took this browser's row back meanwhile: taking it again would count it twice.
  const adopt = !known && seenResets() === null;
  const given = answer && typeof answer === 'object' ? Reflect.get(answer, 'quizzes') : undefined;
  const fromAccount = given && typeof given === 'object' ? given : {};
  for (const quiz of QUIZZES) {
    const entry: unknown = Reflect.get(fromAccount, quiz);
    const part = (name: string) =>
      entry && typeof entry === 'object' ? Reflect.get(entry, name) : undefined;
    const resetAt = part('reset');
    if (typeof resetAt === 'string' && (seen[quiz] ?? '') < resetAt) {
      // Cleared on some device since this browser last synced: its row goes too.
      if (known) {
        store(accountKey(quiz), emptyStats());
        again = true; // sent again, now that it knows
      }
      seen[quiz] = resetAt;
    }
    if (adopt) {
      // Just signed in: this browser's row as the account kept it, with anything played since.
      const played = readStats(stored(accountKey(quiz)), any);
      store(accountKey(quiz), addStats(readStats(part('mine'), any), played));
      if (played.asked > 0 || played.rounds > 0) again = true;
    }
    store(othersKey(quiz), part('others') ?? emptyStats());
  }
  store(SEEN_KEY, seen);
  document.dispatchEvent(new CustomEvent(SYNCED_EVENT));
}

/**
 * A quiz's results cleared: signed out, this browser's; signed in, the account's (on every device,
 * sent with a sync), leaving the anonymous ones alone.
 */
export function clearResults(quiz: string): void {
  if (!signedInHere()) {
    store(quizKeys(quiz).stats, emptyStats());
    return;
  }
  store(accountKey(quiz), emptyStats());
  store(othersKey(quiz), emptyStats());
}

/**
 * Signed out: the account's results leave this browser; its anonymous ones show again. Its name
 * goes too, so accounts signed in here one after another aren't tied to one browser.
 */
export function forgetAccountResults(): void {
  for (const key of [
    ...QUIZZES.map(othersKey),
    ...QUIZZES.map(accountKey),
    SEEN_KEY,
    PENDING_KEY,
    DEVICE_KEY,
  ]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage blocked: nothing was kept.
    }
  }
  document.dispatchEvent(new CustomEvent(SYNCED_EVENT));
}

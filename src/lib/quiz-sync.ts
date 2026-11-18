/**
 * Quiz results in the learner's account (src/server/quiz-results.ts), for a browser signed in
 * (src/lib/account.ts). This browser keeps its own results as before (`<quiz>-stats`); the
 * account's other devices' arrive beside them (`<quiz>-stats-others`), and the quizzes show the
 * two added together (`resultsOf`). Each sync sends this browser's own results whole, under its
 * own name (`device`): the account replaces its row, so nothing is counted twice.
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

const QUIZZES = Object.values(QUIZ_STORAGE).map((quiz) => quiz.storage);
const othersKey = (quiz: string) => `${quizKeys(quiz).stats}-others`;

/** The account's other devices' results of a quiz, as last heard (none if not signed in). */
export const othersOf = (quiz: string, known: (id: string) => boolean): QuizStats =>
  readStats(stored(othersKey(quiz)), known);

/** This browser's results and the account's other devices', together. */
export const resultsOf = (quiz: string, known: (id: string) => boolean): QuizStats =>
  addStats(readStats(stored(quizKeys(quiz).stats), known), othersOf(quiz, known));

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
 * or null before its first sync with that account: then its results join the account whatever
 * was reset before. Forgotten on signing out, so another account starts afresh.
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
      { stats: stored(quizKeys(quiz).stats), seen: known ? (seen[quiz] ?? '') : null },
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
  // Confirmed: those resets are done (any made meanwhile stay pending).
  store(
    PENDING_KEY,
    pendingResets().filter((quiz) => !reset.includes(quiz)),
  );
  const answer: unknown = await res.json();
  const given = answer && typeof answer === 'object' ? Reflect.get(answer, 'quizzes') : undefined;
  const fromAccount = given && typeof given === 'object' ? given : {};
  for (const quiz of QUIZZES) {
    const entry: unknown = Reflect.get(fromAccount, quiz);
    const others = entry && typeof entry === 'object' ? Reflect.get(entry, 'others') : undefined;
    const resetAt = entry && typeof entry === 'object' ? Reflect.get(entry, 'reset') : undefined;
    if (typeof resetAt === 'string' && (seen[quiz] ?? '') < resetAt) {
      // Cleared on some device since this browser last synced: its own results go too. On the
      // first sync with this account, they joined it instead.
      if (known) {
        store(quizKeys(quiz).stats, emptyStats());
        again = true; // sent again, now that it knows
      }
      seen[quiz] = resetAt;
    }
    store(othersKey(quiz), others ?? emptyStats());
  }
  store(SEEN_KEY, seen);
  document.dispatchEvent(new CustomEvent(SYNCED_EVENT));
}

/** A quiz's results cleared in this browser: its own and the account's (sent with a sync). */
export function clearResults(quiz: string): void {
  store(quizKeys(quiz).stats, emptyStats());
  store(othersKey(quiz), emptyStats());
}

/**
 * Signed out: only this browser's own results stay. They stay its own: whoever signs in here next
 * gets them in their account (one browser, one learner, as before accounts).
 */
export function forgetAccountResults(): void {
  for (const key of [...QUIZZES.map(othersKey), SEEN_KEY, PENDING_KEY]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage blocked: nothing was kept.
    }
  }
  document.dispatchEvent(new CustomEvent(SYNCED_EVENT));
}

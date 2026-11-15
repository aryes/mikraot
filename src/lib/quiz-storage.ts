/**
 * What a quiz remembers in the browser (localStorage), read and written safely: by the quiz itself
 * (src/components/Quiz.tsx) and by the page of all the quizzes (src/components/QuizSummary.tsx).
 * No accounts: it stays in this browser.
 */
import { MAX_LEVEL } from './quiz';

/** The keys of one quiz's memory, after its `storage` name. */
export const quizKeys = (storage: string) => ({
  recent: `${storage}-recent`,
  level: `${storage}-level`,
  time: `${storage}-time-limit`,
  stats: `${storage}-stats`,
});

/** A saved value, or null when storage is blocked, empty or holds something else. */
export function stored(key: string): unknown {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? null : JSON.parse(saved);
  } catch {
    return null;
  }
}

export function store(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the quiz still works, it just doesn't remember.
  }
}

/** The level the options had reached (0 to MAX_LEVEL; 0 if none was saved). */
export function savedLevel(key: string): number {
  const saved = stored(key);
  return typeof saved === 'number' && Number.isInteger(saved)
    ? Math.min(Math.max(saved, 0), MAX_LEVEL)
    : 0;
}

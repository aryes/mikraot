/**
 * Tests that write data (a comment, a log line, a search count) or need the local fixtures run
 * only against the local build, never against a deployed site (`npm run test:deployed`).
 */
export const LOCAL_ONLY = { tag: '@local' } as const;

/**
 * Screenshot comparisons (e2e/visual.spec.ts): run locally only. Fonts render slightly differently
 * on each operating system, so the Windows reference images would fail on CI's Linux; deployed
 * runs skip them too (also tagged @local).
 */
export const VISUAL = { tag: ['@visual', '@local'] };

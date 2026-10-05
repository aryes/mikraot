/**
 * Tests that write data (a comment, a log line, a search count) or need the local fixtures run
 * only against the local build, never against a deployed site (`npm run test:deployed`).
 */
export const LOCAL_ONLY = { tag: '@local' } as const;

/**
 * Tests that write data (a comment, a log line, a search count) or need the local fixtures run
 * only against the local build, never against a deployed site (`npm run test:deployed`).
 */
export const LOCAL_ONLY = { tag: '@local' } as const;

/**
 * Screenshots for Argos (e2e/visual.spec.ts): CI only, where they are uploaded and compared;
 * local runs skip them (nothing to compare with), and so do deployed runs (also tagged @local).
 */
export const VISUAL = { tag: ['@visual', '@local'] };

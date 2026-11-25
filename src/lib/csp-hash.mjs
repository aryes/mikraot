// @ts-check
import { createHash } from 'node:crypto';

/**
 * An inline script's Content-Security-Policy hash (the head scripts, astro.config.mjs).
 * @returns {`sha256-${string}`}
 */
export const hashOf = (/** @type {string} */ script) =>
  `sha256-${createHash('sha256').update(script).digest('base64')}`;

// @ts-check
import { hashOf } from './csp-hash.mjs';

/**
 * Applies the reader's saved tradition for trope names (the header switch, src/scripts/nusach.ts)
 * before the page draws, so the names don't change in front of them: inline in <head>
 * (BaseLayout.astro), so nothing waits for a download. Astro doesn't hash inline scripts, so its
 * hash is added to the Content-Security-Policy (astro.config.mjs).
 */
export const NUSACH_HEAD_SCRIPT = `try {
  const nusach = localStorage.getItem('nusach');
  if (nusach === 'sephardi') {
    document.documentElement.dataset.nusach = nusach;
    document.title = document.documentElement.dataset.titleSephardi || document.title;
  }
} catch {}`;

export const NUSACH_HEAD_HASH = hashOf(NUSACH_HEAD_SCRIPT);

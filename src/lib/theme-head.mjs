// @ts-check
import { hashOf } from './csp-hash.mjs';

/**
 * Light or dark (the switch, src/scripts/theme.ts): the reader's saved choice, or the device's
 * setting when there is none, applied before the page draws so it never flashes the other colours.
 * `data-theme="dark"` on <html> is what every dark style reads (global.css); a saved choice is
 * kept in `data-theme-choice` for the pictures' script below; the `color-scheme` meta follows, for
 * the browser's own colours between pages. Inline in <head> (BaseLayout.astro), after that meta;
 * its hash is in the Content-Security-Policy (astro.config.mjs). Without JavaScript the page is
 * light (its pictures still follow the device).
 */
export const THEME_HEAD_SCRIPT = `{
  let saved = null;
  try {
    saved = localStorage.getItem('theme');
  } catch {}
  const root = document.documentElement;
  const dark =
    saved === 'dark' || (saved !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) root.dataset.theme = 'dark';
  if (saved === 'dark' || saved === 'light') root.dataset.themeChoice = saved;
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', dark ? 'dark' : 'light');
}`;

/**
 * Inside each <picture> with a dark version, between its sources and its <img>: for a reader who
 * chose light or dark, turns the dark sources off or on before the <img> is read. Their default,
 * the device's setting (`DEVICE_DARK`, src/lib/theme.ts), lets the browser's look-ahead start the right picture for
 * everyone else; only a reader whose choice differs from the device may get both. On screens only:
 * print stays light. The switch changes them later (src/scripts/theme.ts).
 */
export const THEME_PICTURE_SCRIPT = `{
  const choice = document.documentElement.dataset.themeChoice;
  if (choice) {
    for (const source of document.currentScript.parentElement.querySelectorAll('source[data-dark]')) {
      source.media = choice === 'dark' ? 'screen' : 'not all';
    }
  }
}`;

export const THEME_HEAD_HASH = hashOf(THEME_HEAD_SCRIPT);
export const THEME_PICTURE_HASH = hashOf(THEME_PICTURE_SCRIPT);

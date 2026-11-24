/**
 * The light/dark switch (src/components/SiteHeader.astro, [data-theme-switch]: in the header, and
 * in the phone menu instead on phones): each
 * click moves to the next of "by the device" (the default), light and dark. The choice is saved
 * in the browser, applied before the next page draws (src/lib/theme-head.mjs), and shown at once
 * by `data-theme` on <html>, which every dark style reads (global.css). "By the device" also
 * follows a change of the device's setting while the page is open. The switch is hidden until this
 * runs: without JavaScript the site is light.
 */

import { DEVICE_DARK, nextTheme, THEME_LABELS, type ThemeChoice as Choice } from '../lib/theme';

const KEY = 'theme';
const root = document.documentElement;
const system = matchMedia('(prefers-color-scheme: dark)');

function saved(): Choice {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'auto';
  } catch {
    return 'auto';
  }
}

function save(choice: Choice): void {
  try {
    if (choice === 'auto') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

/** The page's colours, the browser's own, and the dark versions of pictures (theme-head.mjs). */
function apply(choice: Choice): void {
  const dark = choice === 'dark' || (choice === 'auto' && system.matches);
  if (dark) root.dataset['theme'] = 'dark';
  else delete root.dataset['theme'];
  if (choice === 'auto') delete root.dataset['themeChoice'];
  else root.dataset['themeChoice'] = choice;
  document
    .querySelector('meta[name="color-scheme"]')
    ?.setAttribute('content', dark ? 'dark' : 'light');
  const media = { auto: DEVICE_DARK, light: 'not all', dark: 'screen' }[choice];
  for (const source of document.querySelectorAll<HTMLSourceElement>('source[data-dark]')) {
    source.media = media;
  }
}

const switches = [...document.querySelectorAll<HTMLButtonElement>('[data-theme-switch]')];

function show(choice: Choice): void {
  for (const button of switches) {
    button.dataset['choice'] = choice;
    const name = `תצוגה: ${THEME_LABELS[choice]}`;
    // The menu's button shows its name; the header's, an icon, is named for screen readers.
    const label = button.querySelector('[data-theme-label]');
    if (label) label.textContent = name;
    else button.setAttribute('aria-label', name);
    button.title = `תצוגה: ${THEME_LABELS[choice]}. לחיצה: ${THEME_LABELS[nextTheme(choice)]}`;
  }
}

let current = saved();
show(current);
for (const button of switches) {
  button.addEventListener('click', () => {
    current = nextTheme(current);
    save(current);
    apply(current);
    show(current);
  });
  button.hidden = false;
}

// The device's setting changed (e.g. at sunset).
system.addEventListener('change', () => {
  if (current === 'auto') apply(current);
});
function reload(): void {
  current = saved();
  apply(current);
  show(current);
}
addEventListener('storage', (event) => {
  if (event.key === KEY || event.key === null) reload();
});
// A page brought back by Back or Forward may have missed a choice made meanwhile.
addEventListener('pageshow', (event) => {
  if (event.persisted) reload();
});

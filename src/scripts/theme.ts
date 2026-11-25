/**
 * The light/dark switch (src/components/layout/ThemeSwitch.astro): light, by the device (the
 * default) or dark; in the header a toggle showing the choice, the other two appearing beside it,
 * in the menu on phones the three side by side. The choice is saved
 * in the browser, applied before the next page draws (src/lib/theme-head.mjs), and shown at once
 * by `data-theme` on <html>, which every dark style reads (global.css). "By the device" also
 * follows a change of the device's setting while the page is open. The switch is hidden until this
 * runs: without JavaScript the site is light.
 */

import { DEVICE_DARK, THEME_LABELS, type ThemeChoice as Choice } from '../lib/theme';

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

const inputs = [
  ...document.querySelectorAll<HTMLInputElement>('[data-theme-switch] input[type="radio"]'),
];
const isChoice = (value: string): value is Choice => Object.hasOwn(THEME_LABELS, value);

function show(choice: Choice): void {
  for (const input of inputs) input.checked = input.value === choice;
}

/**
 * The header's toggle (ThemeSwitch.astro, `compact`) opens on hover and keyboard focus by CSS; on
 * a touch screen, which has no hover, a tap on the chosen one opens it (`data-open`). A choice by
 * the pointer closes it, and hover doesn't open it again until the pointer has left
 * (`data-folded`); a press elsewhere closes it too.
 */
for (const toggle of document.querySelectorAll<HTMLElement>('[data-theme-switch][data-compact]')) {
  const setOpen = (open: boolean) => toggle.toggleAttribute('data-open', open);
  // How the last press came: a mouse hovers, so its click on the chosen one opens nothing.
  let touch = false;
  toggle.addEventListener('pointerdown', (event) => {
    touch = event.pointerType !== 'mouse';
  });
  toggle.addEventListener('click', (event) => {
    // The press on a label (detail > 0), before it checks its radio: a tap on the chosen one
    // opens or closes the toggle, another is a choice. Arrow keys make clicks of detail 0: ignored.
    const label = event.target instanceof Element ? event.target.closest('label') : null;
    if (!label || event.detail === 0 || event.target instanceof HTMLInputElement) return;
    const chosen = label.querySelector('input')?.checked ?? false;
    setOpen(chosen && touch && !toggle.hasAttribute('data-open'));
    if (!chosen) toggle.toggleAttribute('data-folded', true);
  });
  toggle.addEventListener('pointerleave', () => {
    toggle.removeAttribute('data-folded');
  });
  // A press anywhere else closes it (pointerdown: iOS sends no click for a tap on plain text).
  document.addEventListener('pointerdown', (event) => {
    if (event.target instanceof Node && !toggle.contains(event.target)) setOpen(false);
  });
}

let current = saved();
show(current);
for (const input of inputs) {
  input.addEventListener('change', () => {
    if (!input.checked || !isChoice(input.value)) return;
    current = input.value;
    save(current);
    apply(current);
    show(current); // the other switch (header and menu) too
  });
}
for (const control of document.querySelectorAll<HTMLElement>('[data-theme-switch]')) {
  control.hidden = false;
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

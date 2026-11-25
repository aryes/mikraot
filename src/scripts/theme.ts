/**
 * The light/dark switch: light, by the device (the default) or dark; in the header a button
 * showing the choice that opens the three (src/components/layout/ThemePicker.astro), in the menu
 * on phones the three side by side (ThemeSwitch.astro). The choice is saved
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

const pickers = [...document.querySelectorAll<HTMLElement>('[data-theme-picker]')];

function show(choice: Choice): void {
  for (const input of inputs) input.checked = input.value === choice;
  for (const picker of pickers) {
    picker.dataset['choice'] = choice;
    picker.querySelector('button')?.setAttribute('aria-label', `תצוגה: ${THEME_LABELS[choice]}`);
  }
}

/** The header's picker: its choices open on hover (CSS), or on a click, Enter or Space. */
function setOpen(picker: HTMLElement, open: boolean): void {
  picker.toggleAttribute('data-open', open);
  picker.querySelector('button')?.setAttribute('aria-expanded', String(open));
}
for (const picker of pickers) {
  const button = picker.querySelector('button');
  button?.addEventListener('click', () => {
    setOpen(picker, !picker.hasAttribute('data-open'));
  });
  picker.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !picker.hasAttribute('data-open')) return;
    setOpen(picker, false);
    button?.focus();
  });
  // A choice made by a click or a tap closes them; one made by the arrow keys (clicks of detail 0)
  // leaves them open under the keyboard's focus.
  picker.querySelector('fieldset')?.addEventListener('click', (event) => {
    if (event.detail > 0) setOpen(picker, false);
  });
  // Closed by a click elsewhere.
  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !picker.contains(event.target)) setOpen(picker, false);
  });
  // The keyboard's focus leaving it (Tab): a press on a choice's label moves focus nowhere
  // (relatedTarget null) and must not close it before its click lands.
  picker.addEventListener('focusout', (event) => {
    const to = event.relatedTarget;
    if (to instanceof Node && !picker.contains(to)) setOpen(picker, false);
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
for (const control of document.querySelectorAll<HTMLElement>(
  '[data-theme-switch], [data-theme-picker]',
)) {
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

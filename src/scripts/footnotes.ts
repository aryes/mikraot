/**
 * Footnotes (src/components/content/ContentLink.astro): pointing at a footnote number, or tabbing
 * to it, shows its note beside it, as Wikipedia does, so the reader needn't jump to the page's end.
 * Touch screens have no hover: a tap jumps to the note, whose number leads back. Links inside a
 * note are followed from the note itself (the popup closes when the number loses focus); screen
 * readers get the note as the number's description.
 *
 * Written here rather than with a library: the popup is one positioned box, and the native ways
 * (the Popover API's `interestfor`, CSS anchor positioning) don't yet work in every browser.
 */
const SHOW_DELAY = 150;
const HIDE_DELAY = 300;

let popup: HTMLDivElement | null = null;
let shownFor: HTMLAnchorElement | null = null;
let timer: number | undefined;

function getPopup(): HTMLDivElement {
  if (!popup) {
    popup = document.createElement('div');
    popup.id = 'footnote-popup';
    popup.className = 'footnote-popup';
    popup.setAttribute('role', 'tooltip');
    popup.hidden = true;
    // Moving from the number into the popup (to follow a link in the note) keeps it open.
    popup.addEventListener('pointerenter', () => window.clearTimeout(timer));
    popup.addEventListener('pointerleave', () => later(hide, HIDE_DELAY));
    document.body.append(popup);
  }
  return popup;
}

function later(action: () => void, delay: number): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(action, delay);
}

function show(ref: HTMLAnchorElement): void {
  const note = document.getElementById(ref.hash.slice(1));
  if (!note) return;
  const box = getPopup();
  const copy = note.cloneNode(true);
  if (!(copy instanceof HTMLElement)) return;
  // The note's own number links back to the text, which is where the reader already is.
  copy.querySelector('.footnote-back')?.remove();
  box.replaceChildren(...copy.childNodes);
  box.hidden = false;
  shownFor?.removeAttribute('aria-describedby');
  shownFor = ref;
  ref.setAttribute('aria-describedby', box.id);
  place(box, ref);
}

function hide(): void {
  if (popup) popup.hidden = true;
  shownFor?.removeAttribute('aria-describedby');
  shownFor = null;
}

/** Below the number (above it when there is no room), kept inside the window's width. */
function place(box: HTMLElement, ref: HTMLElement): void {
  const margin = 8;
  // Measured at the corner: its width would otherwise be squeezed by where it was last shown.
  box.style.left = '0';
  box.style.top = '0';
  const at = ref.getBoundingClientRect();
  const { width, height } = box.getBoundingClientRect();
  const left = Math.min(
    Math.max(at.left + at.width / 2 - width / 2, margin),
    document.documentElement.clientWidth - width - margin,
  );
  const below = at.bottom + margin + height <= window.innerHeight;
  const top = below ? at.bottom + margin : at.top - margin - height;
  box.style.left = `${left + window.scrollX}px`;
  box.style.top = `${top + window.scrollY}px`;
}

const refFrom = (target: EventTarget | null) =>
  target instanceof Element ? target.closest<HTMLAnchorElement>('.footnote-ref a') : null;

document.addEventListener('pointerover', (event) => {
  const ref = refFrom(event.target);
  if (ref && event.pointerType === 'mouse') later(() => show(ref), SHOW_DELAY);
});
document.addEventListener('pointerout', (event) => {
  if (refFrom(event.target) && event.pointerType === 'mouse') later(hide, HIDE_DELAY);
});
document.addEventListener('focusin', (event) => {
  const ref = refFrom(event.target);
  if (ref) show(ref);
});
document.addEventListener('focusout', (event) => {
  if (refFrom(event.target)) hide();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') hide();
});
// Following the number to the note: the popup has done its job.
document.addEventListener('click', (event) => {
  if (refFrom(event.target)) hide();
});

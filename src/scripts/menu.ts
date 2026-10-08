/**
 * Desktop menu dropdowns as the WAI-ARIA "disclosure navigation" pattern: each group's button
 * (src/components/SiteHeader.astro, [data-menu-toggle]) toggles aria-expanded, which CSS uses to
 * show its list. Escape closes the innermost open list and returns focus to its button; focus
 * leaving a group, or a click elsewhere, closes it. Hover still opens lists for the mouse (CSS),
 * and without JavaScript focus does (Tailwind's noscript: variant).
 */

const nav = document.querySelector<HTMLElement>('[data-desktop-menu]');

/** The menu item (top-level <li> or second-level group) a toggle belongs to. */
const itemOf = (toggle: Element) => toggle.closest('[data-menu-item]');

function setOpen(toggle: Element, open: boolean): void {
  toggle.setAttribute('aria-expanded', String(open));
  // Closing a list also closes any list opened inside it.
  if (!open) {
    for (const inner of itemOf(toggle)?.querySelectorAll('[data-menu-toggle]') ?? []) {
      if (inner !== toggle) inner.setAttribute('aria-expanded', 'false');
    }
  }
}

if (nav) {
  const toggles = [...nav.querySelectorAll('[data-menu-toggle]')];
  const openToggles = () => toggles.filter((t) => t.getAttribute('aria-expanded') === 'true');

  nav.addEventListener('click', (event) => {
    const toggle = event.target instanceof Element && event.target.closest('[data-menu-toggle]');
    if (!toggle) return;
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    // One list open at a time, apart from the lists this one sits in.
    for (const other of openToggles()) {
      if (other !== toggle && !itemOf(other)?.contains(toggle)) setOpen(other, false);
    }
    setOpen(toggle, open);
  });

  nav.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    // The innermost open list holding the focus (the last one in document order).
    const focused = document.activeElement;
    const innermost = openToggles().findLast((t) => focused && itemOf(t)?.contains(focused));
    if (innermost instanceof HTMLElement) {
      event.preventDefault();
      setOpen(innermost, false);
      innermost.focus();
      return;
    }
    // A list opened by hovering isn't marked open: Escape then just returns to its button.
    // (The nearest enclosing item with a button of its own: a plain link's row has none.)
    let item = focused?.closest('[data-menu-item]');
    let hovered = item?.querySelector(':scope > [data-menu-toggle]');
    while (item && (!hovered || hovered === focused)) {
      item = item.parentElement?.closest('[data-menu-item]');
      hovered = item?.querySelector(':scope > [data-menu-toggle]');
    }
    if (hovered instanceof HTMLElement) {
      event.preventDefault();
      hovered.focus();
    }
  });

  nav.addEventListener('focusout', (event) => {
    const next = event.relatedTarget;
    for (const toggle of openToggles()) {
      if (!(next instanceof Node) || !itemOf(toggle)?.contains(next)) setOpen(toggle, false);
    }
  });

  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && nav.contains(event.target)) return;
    for (const toggle of openToggles()) setOpen(toggle, false);
  });
}

/**
 * The header's reading-tradition switch (src/components/SiteHeader.astro, [data-nusach-switch]):
 * the choice is saved in the browser and shown at once, by the `data-nusach` attribute on <html>
 * that CSS reads (global.css) and by the tab title (BaseLayout.astro's `data-title-*`). The saved
 * choice is applied before the page draws by the inline script in BaseLayout.astro. The switch is
 * hidden until this runs: without JavaScript it couldn't do anything.
 */

const DEFAULT = 'ashkenazi';
const root = document.documentElement;

function apply(nusach: string): void {
  if (nusach === DEFAULT) delete root.dataset['nusach'];
  else root.dataset['nusach'] = nusach;
  const title = root.getAttribute(`data-title-${nusach}`);
  if (title) document.title = title;
}

for (const control of document.querySelectorAll<HTMLElement>('[data-nusach-switch]')) {
  const select = control.querySelector('select');
  if (!select) continue;
  select.value = root.dataset['nusach'] ?? DEFAULT;
  select.addEventListener('change', () => {
    apply(select.value);
    try {
      if (select.value === DEFAULT) localStorage.removeItem('nusach');
      else localStorage.setItem('nusach', select.value);
    } catch {
      // Storage blocked: the choice lasts for this page only.
    }
  });
  control.hidden = false;
}

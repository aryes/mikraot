/**
 * Event counts in Umami (the visitor statistics, loaded by BaseLayout.astro): audio plays, opened
 * answers, video plays and "page not found" visits, beside Umami's own page views. Umami counts
 * only on mikraot.net (its `data-domains`), so local runs, tests and previews send nothing.
 */
interface Umami {
  track(event: string, data?: Record<string, string>): void;
}

declare global {
  interface Window {
    umami?: Umami;
  }
}

/** Counts an event; if Umami's script hasn't run yet, once the page has loaded. */
export function track(event: string, data?: Record<string, string>): void {
  if (window.umami) {
    window.umami.track(event, data);
    return;
  }
  addEventListener('load', () => window.umami?.track(event, data), { once: true });
}

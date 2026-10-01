// Loads Pagefind's search module on demand (used by src/scripts/search.ts). Kept as a plain file:
// bundled scripts wrap import() in a Vite preload helper that breaks at runtime, and an inline
// script would need its own Content-Security-Policy hash.
window.loadPagefind = () => import('/pagefind/pagefind.js');

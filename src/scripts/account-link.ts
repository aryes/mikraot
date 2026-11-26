/**
 * The header's account link (src/components/SiteHeader.astro): marked while this browser is
 * signed in, as remembered by the account page (src/lib/account.ts), without asking the server on
 * every page.
 */
import { signedInHere } from '../lib/account';

function show() {
  const signedIn = signedInHere();
  for (const link of document.querySelectorAll<HTMLElement>('[data-account-link]')) {
    link.toggleAttribute('data-signed-in', signedIn);
    link.setAttribute('aria-label', signedIn ? 'החשבון שלי (מחובר)' : 'התחברות');
    link.title = signedIn ? 'החשבון שלי' : 'התחברות';
  }
}

show();
document.addEventListener('account-change', show);
// Signed in or out in another tab.
window.addEventListener('storage', show);

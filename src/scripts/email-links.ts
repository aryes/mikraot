/** Restores the addresses hidden by EmailLink.astro (src/lib/email-obfuscation.ts). */
import { decodeEmail } from '../lib/email-obfuscation';

for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-email]')) {
  const address = decodeEmail(link.dataset['email'] ?? '');
  link.href = `mailto:${address}`;
  if (link.hasAttribute('data-email-text')) link.textContent = address;
  link.removeAttribute('data-email');
}

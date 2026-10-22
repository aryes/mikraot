/**
 * Email addresses hidden from harvesting bots, as Cloudflare's Scrape Shield did for WordPress (it
 * doesn't rewrite the Worker's pages): the page carries the address XOR-ed with a one-byte key, in
 * hex, key first (Cloudflare's own format), and src/scripts/email-links.ts restores it in the
 * browser. Not encryption: it only keeps the address out of the page's text and links.
 */
const KEY = 0x5a;
const hex = (n: number) => n.toString(16).padStart(2, '0');

export function encodeEmail(address: string): string {
  const bytes = new TextEncoder().encode(address);
  return hex(KEY) + [...bytes].map((byte) => hex(byte ^ KEY)).join('');
}

export function decodeEmail(encoded: string): string {
  const key = Number.parseInt(encoded.slice(0, 2), 16);
  const bytes = (encoded.slice(2).match(/../g) ?? []).map(
    (pair) => Number.parseInt(pair, 16) ^ key,
  );
  return new TextDecoder().decode(new Uint8Array(bytes));
}

import ipaddr from 'ipaddr.js';

/**
 * The key a visitor is rate-limited by. An IPv4 address is one visitor; with IPv6 one visitor
 * usually has a whole /64 network (2^64 addresses), so keying on the full address would let them
 * rotate addresses without limit. IPv6 addresses are therefore keyed on their first 64 bits.
 * Someone with a larger allocation (/56, /48) can still rotate between /64s: acceptable here.
 */
export function rateLimitKey(address: string): string {
  if (!ipaddr.isValid(address)) return address;
  const parsed = ipaddr.process(address); // IPv4-mapped IPv6 becomes IPv4
  if (parsed.kind() === 'ipv4') return parsed.toString();
  const network = ipaddr.IPv6.networkAddressFromCIDR(`${parsed.toString()}/64`);
  return `${network.toString()}/64`;
}

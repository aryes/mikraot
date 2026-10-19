import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS, withSecurityHeaders } from './security-headers';

/** The headers of public/_headers' `/*` block: what Cloudflare adds to every static file. */
function staticHeaders(): Record<string, string> {
  const block = readFileSync('public/_headers', 'utf8')
    .split(/\n(?=\S)/)
    .find((part) => part.startsWith('/*\n'));
  return Object.fromEntries(
    (block ?? '')
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]),
  );
}

describe('SECURITY_HEADERS', () => {
  it('is the same as the static files get from public/_headers', () => {
    expect(SECURITY_HEADERS).toEqual(staticHeaders());
  });
});

describe('withSecurityHeaders', () => {
  it('adds every header a response lacks, keeping its status and body', async () => {
    const response = withSecurityHeaders(new Response('ok', { status: 201 }));
    expect(response.status).toBe(201);
    expect(await response.text()).toBe('ok');
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name), name).toBe(value);
    }
  });

  it('keeps a header the response sets itself', () => {
    const own = new Response(null, { headers: { 'Referrer-Policy': 'no-referrer' } });
    expect(withSecurityHeaders(own).headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it("adds frame-ancestors to a page's own policy (Astro's header for on-demand pages)", () => {
    const page = new Response(null, {
      headers: { 'Content-Security-Policy': "default-src 'self'; script-src 'self';" },
    });
    expect(withSecurityHeaders(page).headers.get('Content-Security-Policy')).toBe(
      "default-src 'self'; script-src 'self'; frame-ancestors 'none'",
    );
  });
});

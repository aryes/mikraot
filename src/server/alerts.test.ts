import { describe, expect, it, vi } from 'vitest';
import { ALERT_INTERVAL_SECONDS, alertOwner, type AlertStore } from './alerts';

function memoryStore() {
  const values = new Map<string, string>();
  const ttls: number[] = [];
  const store: AlertStore = {
    get: (key) => Promise.resolve(values.get(key) ?? null),
    put: (key, value, { expirationTtl }) => {
      values.set(key, value);
      ttls.push(expirationTtl);
      return Promise.resolve();
    },
  };
  return { store, ttls };
}

const okFetch = () => vi.fn<typeof fetch>(() => Promise.resolve(new Response('{}')));
const now = new Date('2026-10-09T02:17:00Z');

describe('alertOwner', () => {
  it('emails the owner once, then waits an hour before the next email of that kind', async () => {
    const { store, ttls } = memoryStore();
    const fetchFn = okFetch();
    const options = { apiKey: 'key', store, now, fetchFn };
    await alertOwner({ ...options, kind: 'request', detail: 'GET /api/comments/: 500' });
    await alertOwner({ ...options, kind: 'request', detail: 'GET /comments/feed/: 500' });
    await alertOwner({ ...options, kind: 'backup', detail: 'Error: D1 unavailable' });

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(ttls).toEqual([ALERT_INTERVAL_SECONDS, ALERT_INTERVAL_SECONDS]);
    const body = await new Request('https://example.test', {
      method: 'POST',
      body: fetchFn.mock.calls[0]?.[1]?.body ?? null,
    }).text();
    expect(body).toContain('"subject":"תקלה במקראות: בקשה לאתר נכשלה"');
    expect(body).toContain('GET /api/comments/: 500');
  });

  it('sends nothing without a key (branch previews, local runs)', async () => {
    const fetchFn = okFetch();
    const { store } = memoryStore();
    await alertOwner({ apiKey: undefined, store, kind: 'backup', detail: 'x', now, fetchFn });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('never throws, even when the store and the email both fail', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failing: AlertStore = {
      get: () => Promise.reject(new Error('KV down')),
      put: () => Promise.reject(new Error('KV down')),
    };
    await expect(
      alertOwner({ apiKey: 'key', store: failing, kind: 'request', detail: 'x', now }),
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

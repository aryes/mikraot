import { describe, expect, it, vi } from 'vitest';
import { dailyCheck, expectedBackup } from './checks';

const urlOf = (input: RequestInfo | URL) =>
  input instanceof Request ? input.url : input.toString();

const settings = (answers: { keys: string[]; requests: number }) => {
  const fetchFn = vi.fn<typeof fetch>((input) =>
    Promise.resolve(
      urlOf(input).includes('/storage/kv/')
        ? Response.json({ result: answers.keys.map((name) => ({ name })) })
        : Response.json({
            data: {
              viewer: {
                accounts: [
                  { workersInvocationsAdaptive: [{ sum: { requests: answers.requests } }] },
                ],
              },
            },
            errors: null,
          }),
    ),
  );
  return { token: 't', accountId: 'a', fetchFn };
};

/** Settings whose fetch always gives this answer. */
const answer = (body: unknown, status = 200) => ({
  token: 't',
  accountId: 'a',
  fetchFn: vi.fn<typeof fetch>(() => Promise.resolve(Response.json(body, { status }))),
});

const morning = new Date('2026-10-13T06:30:00Z');

describe('expectedBackup', () => {
  it("is today's after the 02:17 UTC run, yesterday's before it", () => {
    expect(expectedBackup(morning)).toBe('d1/2026-10-13.json');
    expect(expectedBackup(new Date('2026-10-13T01:00:00Z'))).toBe('d1/2026-10-12.json');
  });
});

describe('dailyCheck', () => {
  it('finds nothing wrong with the backup there and traffic low', async () => {
    const s = settings({ keys: ['d1/2026-10-13.json'], requests: 950 });
    expect(await dailyCheck(morning, s)).toEqual([]);
    const graphql = s.fetchFn.mock.calls.find(([url]) => urlOf(url).endsWith('/graphql'));
    expect(
      JSON.parse(typeof graphql?.[1]?.body === 'string' ? graphql[1].body : '{}').variables,
    ).toEqual({
      account: 'a',
      day: '2026-10-12',
    });
  });

  it('reports a missing backup and traffic near the free limit', async () => {
    const problems = await dailyCheck(morning, settings({ keys: [], requests: 85_000 }));
    expect(problems).toEqual([
      expect.stringContaining('No database backup d1/2026-10-13.json'),
      expect.stringContaining('85,000 Worker requests on 2026-10-12'),
    ]);
  });

  it("doesn't take a similarly named key for the backup", async () => {
    const problems = await dailyCheck(
      morning,
      settings({ keys: ['d1/2026-10-13.json.tmp'], requests: 1 }),
    );
    expect(problems).toHaveLength(1);
  });

  it('warns from 80,000 requests on', async () => {
    expect(
      await dailyCheck(morning, settings({ keys: ['d1/2026-10-13.json'], requests: 79_999 })),
    ).toEqual([]);
    expect(
      await dailyCheck(morning, settings({ keys: ['d1/2026-10-13.json'], requests: 80_000 })),
    ).toHaveLength(1);
  });

  it('fails loudly when Cloudflare refuses or answers with errors', async () => {
    await expect(dailyCheck(morning, answer({}, 403))).rejects.toThrow('KV keys: 403');
    // No KV result at all counts as no backup; then GraphQL's errors are thrown.
    await expect(dailyCheck(morning, answer({ errors: [{ message: 'bad' }] }))).rejects.toThrow(
      'GraphQL',
    );
  });
});

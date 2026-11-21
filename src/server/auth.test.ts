import { describe, expect, it } from 'vitest';
import { authOptions, removeExpired, signInEmail, signInLink, type AuthSettings } from './auth';

const settings: AuthSettings = {
  // Never queried here.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test double
  db: {} as AuthSettings['db'],
  secret: 'x'.repeat(40),
  sendLink: () => Promise.resolve(),
};

describe('sign-in links', () => {
  it('lead to the account page with the token after #, where no server sees it', () => {
    expect(signInLink('https://mikraot.net', 'a b+c')).toBe(
      'https://mikraot.net/account/#signin=a%20b%2Bc',
    );
  });

  it('are emailed with the link escaped', () => {
    const email = signInEmail('learner@example.com', 'https://mikraot.net/account/#signin=a"<b>');
    expect(email.to).toEqual([{ email: 'learner@example.com' }]);
    expect(email.htmlContent).toContain('#signin=a&quot;&lt;b&gt;');
    expect(email.htmlContent).not.toContain('<b>');
    expect(email.textContent).toContain('https://mikraot.net/account/#signin=a"<b>');
  });
});

describe('authOptions', () => {
  it('trusts local addresses only when asked (local runs, tests)', () => {
    expect(authOptions(settings)).not.toHaveProperty('trustedOrigins');
    expect(authOptions({ ...settings, trustLocal: true }).trustedOrigins).toContain(
      'http://localhost:*',
    );
  });

  it('offers Google only with its app', () => {
    expect(authOptions(settings)).not.toHaveProperty('socialProviders');
    const google = { clientId: 'id', clientSecret: 'secret' };
    expect(authOptions({ ...settings, google }).socialProviders).toEqual({ google });
  });

  it("keeps no IP address or browser in a session, and no provider's tokens", async () => {
    const hooks = authOptions(settings).databaseHooks;
    const [now, userId] = [new Date(), 'u'];
    const session = await hooks.session.create.before({
      id: 's',
      token: 't',
      userId,
      expiresAt: now,
      createdAt: now,
      updatedAt: now,
      ipAddress: '192.0.2.1',
      userAgent: 'Browser',
    });
    expect(session.data).toMatchObject({ ipAddress: null, userAgent: null });
    const account = await hooks.account.create.before({
      id: 'a',
      accountId: 'g',
      providerId: 'google',
      userId,
      createdAt: now,
      updatedAt: now,
      accessToken: 'at',
      refreshToken: 'rt',
      idToken: 'it',
    });
    expect(account.data).toMatchObject({ accessToken: null, refreshToken: null, idToken: null });
  });
});

describe('removeExpired', () => {
  it('deletes unused sign-in links and sessions that ran out', async () => {
    const runs: { query: string; values: unknown[] }[] = [];
    const db = {
      prepare: (query: string) => ({
        bind: (...values: unknown[]) => ({
          all: () => {
            runs.push({ query, values });
            return Promise.resolve();
          },
        }),
      }),
    };
    await removeExpired(db, new Date('2026-11-18T02:17:00Z'));
    expect(runs).toEqual([
      {
        query: 'DELETE FROM "verification" WHERE "expiresAt" < ?',
        values: ['2026-11-18T02:17:00.000Z'],
      },
      {
        query: 'DELETE FROM "session" WHERE "expiresAt" < ?',
        values: ['2026-11-18T02:17:00.000Z'],
      },
    ]);
  });
});

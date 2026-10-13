/**
 * The daily outside check (.github/workflows/daily-check.yml): what the site can't report about
 * itself. The Worker emails Arye when a backup fails (src/worker.ts), but not when the daily run
 * never starts; and nothing warns as requests near the free plan's daily limit.
 */
import { backupKey } from '../../src/server/backup';

const API = 'https://api.cloudflare.com/client/v4';
/** Workers KV namespace BACKUPS (wrangler.jsonc). */
const BACKUPS_NAMESPACE = '74ecb19e9d864308bd5f9b0add3e2c11';
/** The free plan's Worker requests a day (docs/OPERATIONS.md); warn at 80% of it. */
export const DAILY_REQUESTS = 100_000;
export const WARN_AT = 0.8;

/** A property of an unknown JSON value, or undefined. */
const field = (value: unknown, key: string): unknown =>
  value && typeof value === 'object' ? Reflect.get(value, key) : undefined;

export interface Settings {
  token: string;
  accountId: string;
  fetchFn?: typeof fetch;
}

/** The KV key of today's backup (02:17 UTC), or yesterday's if checked before it can exist. */
export function expectedBackup(now: Date): string {
  const day = new Date(now);
  if (now.getUTCHours() < 3) day.setUTCDate(day.getUTCDate() - 1);
  return backupKey(day);
}

/** Whether the backup with this key is in Workers KV. */
export async function backupExists(key: string, settings: Settings): Promise<boolean> {
  const { token, accountId, fetchFn = fetch } = settings;
  const url = `${API}/accounts/${accountId}/storage/kv/namespaces/${BACKUPS_NAMESPACE}/keys?prefix=${encodeURIComponent(key)}`;
  const res = await fetchFn(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`KV keys: ${res.status} ${await res.text()}`);
  const body: unknown = await res.json();
  const keys = field(body, 'result');
  return Array.isArray(keys) && keys.some((k: unknown) => field(k, 'name') === key);
}

/**
 * All Workers' requests on one UTC day (YYYY-MM-DD), from the GraphQL Analytics API: the free
 * plan's limit is per account (the old `mikraot-api` Worker counts too, though it has no routes).
 */
export async function workerRequests(day: string, settings: Settings): Promise<number> {
  const { token, accountId, fetchFn = fetch } = settings;
  const query = `query ($account: String!, $day: Date!) {
    viewer { accounts(filter: { accountTag: $account }) {
      workersInvocationsAdaptive(limit: 100, filter: { date: $day }) {
        sum { requests }
      }
    } }
  }`;
  const res = await fetchFn(`${API}/graphql`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables: { account: accountId, day } }),
  });
  if (!res.ok) throw new Error(`GraphQL: ${res.status} ${await res.text()}`);
  const body: unknown = await res.json();
  const errors = field(body, 'errors');
  if (Array.isArray(errors) && errors.length > 0) {
    throw new Error(`GraphQL: ${JSON.stringify(errors)}`);
  }
  const accounts = field(field(field(body, 'data'), 'viewer'), 'accounts');
  const rows: unknown = Array.isArray(accounts)
    ? field(accounts[0], 'workersInvocationsAdaptive')
    : undefined;
  return (Array.isArray(rows) ? rows : []).reduce<number>((total, row: unknown) => {
    const requests = field(field(row, 'sum'), 'requests');
    return total + (typeof requests === 'number' ? requests : 0);
  }, 0);
}

/** The problems found (an empty list when all is well). */
export async function dailyCheck(now: Date, settings: Settings): Promise<string[]> {
  const problems: string[] = [];
  const key = expectedBackup(now);
  if (!(await backupExists(key, settings))) {
    problems.push(
      `No database backup ${key} in Workers KV: the daily run didn't happen or failed.`,
    );
  }
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const day = yesterday.toISOString().slice(0, 10);
  const requests = await workerRequests(day, settings);
  if (requests >= DAILY_REQUESTS * WARN_AT) {
    problems.push(
      `${requests.toLocaleString('en')} Worker requests on ${day} (UTC), near the free plan's ${DAILY_REQUESTS.toLocaleString('en')} a day.`,
    );
  }
  return problems;
}

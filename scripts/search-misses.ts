/**
 * Lists the searches that found nothing (src/server/search-misses.ts), most frequent first, from
 * Workers Analytics Engine's SQL API: `npm run search:misses [days]` (default 90, the retention).
 * Uses CF_CONFIG_API_TOKEN (needs Account Analytics: Read) and CF_ACCOUNT_ID from .env. Production
 * only; branch previews write to mikraot_search_misses_preview.
 */
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const API = 'https://api.cloudflare.com/client/v4';
const LIMIT = 200;
const days = Number(process.argv[2] ?? 90);
if (!Number.isInteger(days) || days < 1 || days > 90) {
  console.error('Usage: npm run search:misses [days, 1-90]');
  process.exit(2);
}

// Node's own .env parser; the values stay out of process.env.
const dotenv = parseEnv(readFileSync('.env', 'utf8'));
const setting = (name: string) => {
  const value = dotenv[name];
  if (!value) throw new Error(`${name} is missing from .env`);
  return value;
};
const headers = { authorization: `Bearer ${setting('CF_CONFIG_API_TOKEN')}` };
const accountId = setting('CF_ACCOUNT_ID');

const sql = `SELECT blob1 AS query, SUM(_sample_interval) AS count
  FROM mikraot_search_misses
  WHERE timestamp > NOW() - INTERVAL '${days}' DAY
  GROUP BY query ORDER BY count DESC LIMIT ${LIMIT} FORMAT JSON`;
const res = await fetch(`${API}/accounts/${accountId}/analytics_engine/sql`, {
  method: 'POST',
  headers,
  body: sql,
});
if (res.status === 403) throw new Error('The token lacks Account Analytics: Read');
if (!res.ok) throw new Error(`SQL API: ${res.status} ${await res.text()}`);
const body: unknown = await res.json();
const rows: unknown = body && typeof body === 'object' ? Reflect.get(body, 'data') : undefined;
if (!Array.isArray(rows)) throw new Error('Unexpected SQL API response');
const data = rows.map((row: unknown) => ({
  query: String(row && typeof row === 'object' ? Reflect.get(row, 'query') : ''),
  count: String(row && typeof row === 'object' ? Reflect.get(row, 'count') : ''),
}));
if (data.length === 0) console.log(`No searches without results in the last ${days} days.`);
for (const { query, count } of data) console.log(`${count.padStart(5)}  ${query}`);
if (data.length === LIMIT) console.log(`(the ${LIMIT} most frequent only)`);

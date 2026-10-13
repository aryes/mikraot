/**
 * Runs the daily outside check (scripts/daily-check/checks.ts) and fails with the problems found,
 * which GitHub emails to whoever last changed the workflow's schedule. Needs CF_MONITOR_API_TOKEN (read-only: Workers KV
 * Storage and Account Analytics) and CF_ACCOUNT_ID in the environment (GitHub secrets).
 */
import { dailyCheck } from './checks';

const setting = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

const problems = await dailyCheck(new Date(), {
  token: setting('CF_MONITOR_API_TOKEN'),
  accountId: setting('CF_ACCOUNT_ID'),
});
for (const problem of problems) console.error(`::error::${problem}`);
if (problems.length > 0) process.exit(1);
console.log('Backup present; Worker requests well within the free plan.');

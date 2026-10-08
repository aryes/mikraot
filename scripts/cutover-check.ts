/**
 * The switch-day checks of docs/CUTOVER.md (section 1), in one run: `npm run cutover:check [address]`
 * (default: the workers.dev address). Read-only except for the database export it writes to
 * .backups/ (git-ignored). Run it on the switch day, before the switch; every check must pass.
 *
 *   1. URL parity: every old WordPress address works on the new site (check:urls).
 *   2. Content: every page matches the live WordPress site (build, then compare:live --refresh).
 *   3. Cloudflare rules: no redirect, transform, cache, config or origin rules, no Page Rules and no
 *      Bulk Redirects that could change mikraot.net's responses (the API; token in .env).
 *   4. WordPress: nothing edited or commented since the content export (WP-CLI over SSH).
 *   5. A fresh export of the production database.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { z } from 'astro/zod';

const API = 'https://api.cloudflare.com/client/v4';
/** When the WordPress content was exported (docs/ROADMAP.md); later edits must be carried over. */
const EXPORTED = '2026-09-30';
const target = process.argv[2] ?? 'https://mikraot.mikraot-app.workers.dev';

// Node's own .env parser; the values stay out of process.env.
const dotenv = parseEnv(readFileSync('.env', 'utf8'));
const setting = (name: string) => {
  const value = dotenv[name];
  if (!value) throw new Error(`${name} is missing from .env`);
  return value;
};

const results: { check: string; ok: boolean; detail: string }[] = [];
const record = (check: string, ok: boolean, detail: string) => {
  results.push({ check, ok, detail });
  console.log(`\n${ok ? 'PASS' : 'FAIL'} ${check}: ${detail}`);
};

/** Runs an npm script, showing its output; true when it exits 0. */
const npm = (...args: string[]) =>
  spawnSync('npm', ['run', ...args], { stdio: 'inherit', shell: process.platform === 'win32' })
    .status === 0;

// 1-2. Addresses and content.
record('URL parity', npm('check:urls', '--', target), `old addresses against ${target}`);
const built = npm('build:site');
record(
  'Content',
  built && npm('compare:live', '--', '--refresh'),
  built ? 'every page against the live WordPress site' : 'the build failed',
);

// 3. Cloudflare rules.
/** Cloudflare's answer when a phase has no ruleset ("could not find entrypoint ruleset"). */
const NO_ENTRYPOINT = 10003;

/**
 * A Cloudflare API GET, its result checked against the expected shape. Any error fails the check
 * (a token that lost a permission must not read as "no rules"), except a missing entrypoint,
 * which means the phase has no rules: then null.
 */
async function cloudflare<T extends z.ZodType>(path: string, shape: T): Promise<z.infer<T> | null> {
  const res = await fetch(`${API}${path}`, {
    headers: { authorization: `Bearer ${setting('CF_CONFIG_API_TOKEN')}` },
  });
  const body = z
    .object({
      success: z.boolean(),
      result: z.unknown(),
      errors: z.array(z.object({ code: z.number(), message: z.string() })).default([]),
    })
    .parse(await res.json());
  if (body.success) return shape.parse(body.result);
  if (body.errors.length > 0 && body.errors.every((e) => e.code === NO_ENTRYPOINT)) return null;
  throw new Error(
    `${path.split('/').slice(-2).join('/')}: ${body.errors.map((e) => e.message).join('; ')}`,
  );
}
try {
  const zones = await cloudflare('/zones?name=mikraot.net', z.array(z.object({ id: z.string() })));
  const zone = zones?.[0]?.id;
  if (!zone) throw new Error('zone mikraot.net not found');
  const phases = [
    'http_request_dynamic_redirect',
    'http_request_transform',
    'http_request_late_transform',
    'http_response_headers_transform',
    'http_request_cache_settings',
    'http_config_settings',
    'http_request_origin',
  ];
  const found: string[] = [];
  for (const phase of phases) {
    // null: no entrypoint, so no rules in that phase.
    const entry = await cloudflare(
      `/zones/${zone}/rulesets/phases/${phase}/entrypoint`,
      z.object({ rules: z.array(z.unknown()).optional() }),
    );
    const rules = entry?.rules ?? [];
    if (rules.length > 0) found.push(`${rules.length} ${phase} rule(s)`);
  }
  const pageRules = await cloudflare(`/zones/${zone}/pagerules`, z.array(z.unknown()));
  if (!pageRules) throw new Error('could not read Page Rules');
  if (pageRules.length > 0) found.push('Page Rules');
  const account = await cloudflare(
    `/accounts/${setting('CF_ACCOUNT_ID')}/rulesets`,
    z.array(z.object({ kind: z.string(), phase: z.string() })),
  );
  if (!account) throw new Error('could not read account rulesets');
  const custom = account.filter((ruleset) => ruleset.kind !== 'managed');
  if (custom.length > 0) found.push(custom.map((r) => `account ${r.kind} ${r.phase}`).join(', '));
  record(
    'Cloudflare rules',
    found.length === 0,
    found.length === 0 ? 'none that change responses' : found.join('; '),
  );
} catch (error) {
  record('Cloudflare rules', false, String(error));
}

// 4. WordPress content freeze.
try {
  const remote = `${setting('SSH_USER')}@${setting('SSH_HOST')}`;
  const wp = (args: string) =>
    execFileSync(
      'ssh',
      ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', remote, `cd ~/public_html && wp ${args}`],
      // stderr captured, not shown: ssh names the server's address in its errors.
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim();
  const posts = wp(
    `post list --post_type=any --post_status=any --fields=ID,post_modified --format=csv --orderby=modified --order=DESC --posts_per_page=20`,
  )
    .split('\n')
    .slice(1)
    .filter((line) => (line.split(',')[1]?.replaceAll('"', '') ?? '') > EXPORTED);
  const comments = wp(
    `comment list --status=all --fields=comment_ID,comment_date --format=csv --orderby=comment_date --order=DESC --number=20`,
  )
    .split('\n')
    .slice(1)
    .filter((line) => (line.split(',')[1]?.replaceAll('"', '') ?? '') > EXPORTED);
  record(
    'WordPress freeze',
    posts.length === 0 && comments.length === 0,
    `since ${EXPORTED}: ${posts.length} edited posts or pages, ${comments.length} comments` +
      (posts.length + comments.length > 0
        ? ` (carry them over: ${[...posts, ...comments].join(' ')})`
        : ''),
  );
} catch (error) {
  // Not String(error): it would print the ssh command, with the server's address.
  const status = error instanceof Error && 'status' in error ? String(error.status) : 'none';
  record(
    'WordPress freeze',
    false,
    `WP-CLI over SSH failed (exit ${status}); try the ssh login by hand`,
  );
}

// 5. Database export.
try {
  mkdirSync('.backups', { recursive: true });
  const file = `.backups/cutover-${new Date().toISOString().slice(0, 10)}.sql`;
  execFileSync(
    process.execPath,
    [
      'node_modules/wrangler/bin/wrangler.js',
      'd1',
      'export',
      'mikraot-db',
      '--remote',
      '--output',
      file,
      '--config',
      'wrangler.jsonc',
    ],
    { stdio: 'inherit' },
  );
  record('Database export', true, `${file} (git-ignored; keep it until the switch has settled)`);
} catch (error) {
  record('Database export', false, String(error));
}

console.log('\n=== Switch-day checks ===');
for (const { check, ok, detail } of results)
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${check}: ${detail}`);
const failed = results.filter((r) => !r.ok).length;
console.log(
  failed === 0 ? '\nAll passed: ready for the go/no-go.' : `\n${failed} failed: not ready.`,
);
process.exitCode = failed === 0 ? 0 : 1;

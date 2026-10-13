import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse } from 'jsonc-parser';
import { describe, expect, it } from 'vitest';

/** Every address the Worker answers itself: the pages and API routes with `prerender = false`. */
function onDemandRoutes(dir = join('src', 'pages')): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return onDemandRoutes(path);
    if (!/export const prerender = false/.test(readFileSync(path, 'utf8'))) return [];
    const route = relative(join('src', 'pages'), path)
      .split(sep)
      .join('/')
      .replace(/\.(ts|astro)$/, '')
      .replace(/(^|\/)index$/, '');
    return [route ? `/${route}/` : '/'];
  });
}

/** A run_worker_first pattern as a regular expression (`*` matches anything, `/` included). */
const toRegExp = (pattern: string) =>
  new RegExp(`^${pattern.replaceAll('.', String.raw`\.`).replaceAll('*', '.*')}$`);

describe('wrangler.jsonc assets.run_worker_first', () => {
  it('covers every on-demand route, or browsers opening it get the 404 page', () => {
    const config: unknown = parse(readFileSync('wrangler.jsonc', 'utf8'));
    const patterns: unknown =
      config && typeof config === 'object'
        ? Reflect.get(Reflect.get(config, 'assets') ?? {}, 'run_worker_first')
        : undefined;
    expect(Array.isArray(patterns)).toBe(true);
    const matchers = (Array.isArray(patterns) ? patterns : []).map((p) => toRegExp(String(p)));
    const routes = onDemandRoutes();
    expect(routes).toContain('/unsubscribe/');
    expect(routes.filter((route) => !matchers.some((matcher) => matcher.test(route)))).toEqual([]);
  });
});

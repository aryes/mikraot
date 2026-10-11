import { readFileSync } from 'node:fs';
import { z } from 'astro/zod';
import { describe, expect, it } from 'vitest';

const readJson = <T>(path: string, schema: z.ZodType<T>): T =>
  schema.parse(JSON.parse(readFileSync(path, 'utf8')));

const recorded = readJson(
  'src/assets/fonts/noto-bold-marks/versions.json',
  z.record(z.string(), z.string()),
);

// Our bold-marks copies of Noto's Hebrew subset (scripts/fonts/bold-marks.py) must come from
// the installed Fontsource packages: after an update (Renovate), rerun the script.
describe('Noto with bold marks', () => {
  it.each(Object.entries(recorded))('is built from the installed %s', (name, version) => {
    const installed = readJson(
      `node_modules/${name}/package.json`,
      z.object({ version: z.string() }),
    );
    expect(installed.version, 'rerun scripts/fonts/bold-marks.py').toBe(version);
  });
});

import { defineConfig } from 'vitest/config';

// Unit tests cover plain TypeScript modules, so they don't need Astro's Cloudflare/workerd setup.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});

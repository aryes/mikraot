/**
 * Worker bindings (see wrangler.jsonc), typed with the minimal interfaces the server code uses.
 * The full `@cloudflare/workers-types` are not loaded because they redefine DOM types that the
 * browser code relies on.
 */
declare module 'cloudflare:workers' {
  // An ambient module can't use a relative `import` statement, so the type is imported inline.
  export const env: {
    // oxlint-disable-next-line typescript/consistent-type-imports
    DB: import('./server/comments').CommentsDb;
  };
}

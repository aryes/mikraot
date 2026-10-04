/**
 * Errors from visitors' browsers (sent by src/scripts/error-reporting.ts), written to the Worker
 * logs (Cloudflare dashboard → Workers → mikraot → Observability; kept at most 7 days).
 * Anyone can post here, so a report is size-capped, reduced to known fields and truncated.
 */

export const MAX_REPORT_BYTES = 4096;

export type ErrorKind = 'error' | 'rejection' | 'csp';

export interface ClientError {
  kind: ErrorKind;
  message: string;
  /** The page it happened on (path only). */
  page: string;
  /** Script or blocked resource, with line:column when known. */
  source: string;
  stack: string;
}

const LIMITS = { message: 500, page: 300, source: 300, stack: 2000 } as const;
const KINDS: readonly ErrorKind[] = ['error', 'rejection', 'csp'];

/** Validates a report; null if it isn't one. */
export function parseClientError(body: unknown): ClientError | null {
  const field = (name: keyof typeof LIMITS | 'kind', max = 50): string => {
    const value = body && typeof body === 'object' ? Reflect.get(body, name) : undefined;
    return typeof value === 'string' ? value.slice(0, max) : '';
  };
  const kind = KINDS.find((known) => known === field('kind'));
  if (!kind) return null;
  const report: ClientError = {
    kind,
    message: field('message', LIMITS.message),
    page: field('page', LIMITS.page),
    source: field('source', LIMITS.source),
    stack: field('stack', LIMITS.stack),
  };
  return report.message || report.source ? report : null;
}

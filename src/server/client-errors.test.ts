import { describe, expect, it } from 'vitest';
import { parseClientError } from './client-errors';

describe('parseClientError', () => {
  it('keeps the known fields of a report', () => {
    const report = {
      kind: 'error',
      message: 'x is not defined',
      page: '/דגש-קל/',
      source: '/_astro/content.js:3:14',
      stack: 'at a',
    };
    expect(parseClientError({ ...report, extra: 'dropped' })).toEqual(report);
  });

  it('drops fields that are not text', () => {
    const report = parseClientError({ kind: 'error', message: 'x', source: { evil: true } });
    expect(report?.source).toBe('');
  });

  it('truncates long text', () => {
    const report = parseClientError({ kind: 'rejection', message: 'm'.repeat(10_000) });
    expect(report?.message).toHaveLength(500);
    expect(report?.stack).toBe('');
  });

  it('rejects unknown kinds, empty reports and non-objects', () => {
    expect(parseClientError({ kind: 'other', message: 'x' })).toBeNull();
    expect(parseClientError({ kind: 'csp' })).toBeNull();
    expect(parseClientError('error')).toBeNull();
    expect(parseClientError(null)).toBeNull();
  });
});

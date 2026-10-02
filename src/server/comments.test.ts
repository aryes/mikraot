import { describe, expect, it } from 'vitest';
import {
  addComment,
  listComments,
  listRecentComments,
  parseNewComment,
  parsePageKeys,
  type CommentsDb,
  type PublicComment,
} from './comments';

/** Records the query and bound values; returns the given rows. */
function fakeDb(rows: PublicComment[] = []) {
  const calls: { query: string; values: unknown[] }[] = [];
  const db: CommentsDb = {
    prepare: (query) => ({
      bind: (...values) => {
        calls.push({ query, values });
        return {
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unnecessary-type-parameters -- test double mirrors D1
          all: async <T>() => ({ results: rows as T[] }),
          // oxlint-disable-next-line typescript/no-unsafe-type-assertion, typescript/no-unnecessary-type-parameters -- test double mirrors D1
          first: async <T>() => (rows[0] ?? null) as T | null,
        };
      },
    }),
  };
  return { db, calls };
}

const comment: PublicComment = {
  id: 1,
  page_slug: 'about',
  author_name: 'a',
  content: 'b',
  is_admin_reply: 0,
  created_at: '2024-01-01 00:00:00',
};

describe('parsePageKeys', () => {
  it('splits, trims, deduplicates and drops empty keys', () => {
    expect(parsePageKeys(' about, ,about,טעמים/נוסח-אשכנז ')).toEqual([
      'about',
      'טעמים/נוסח-אשכנז',
    ]);
  });

  it('returns nothing for a missing parameter', () => {
    expect(parsePageKeys(null)).toEqual([]);
  });

  it('caps the number and length of keys', () => {
    expect(parsePageKeys(Array.from({ length: 20 }, (_, i) => `k${i}`).join(','))).toHaveLength(10);
    expect(parsePageKeys('x'.repeat(301))).toEqual([]);
  });
});

describe('parseNewComment', () => {
  const valid = { page_slug: 'about', author_name: ' Name ', content: ' Text ' };

  it('accepts and trims a valid comment; email is optional', () => {
    expect(parseNewComment(valid)).toEqual({
      page_slug: 'about',
      author_name: 'Name',
      author_email: null,
      content: 'Text',
    });
    expect(parseNewComment({ ...valid, author_email: 'a@b.co' })).toMatchObject({
      author_email: 'a@b.co',
    });
  });

  it.each([
    ['not an object', 'nope'],
    ['missing content', { page_slug: 'about', author_name: 'n' }],
    ['whitespace-only name', { ...valid, author_name: '   ' }],
    ['non-string field', { ...valid, content: 42 }],
  ])('rejects %s', (_label, body) => {
    expect(parseNewComment(body)).toEqual({ error: 'Missing required fields' });
  });

  it('rejects a filled-in honeypot field (bots)', () => {
    expect(parseNewComment({ ...valid, website: 'https://spam.example' })).toEqual({
      error: 'Rejected',
    });
  });

  it('rejects over-long fields and invalid emails', () => {
    expect(parseNewComment({ ...valid, content: 'x'.repeat(5001) })).toEqual({
      error: 'content is too long',
    });
    expect(parseNewComment({ ...valid, author_email: 'not-an-email' })).toEqual({
      error: 'Invalid email',
    });
  });
});

describe('listRecentComments', () => {
  it('queries the newest approved comments, public columns only', async () => {
    const { db, calls } = fakeDb([comment]);
    expect(await listRecentComments(db, 20)).toEqual([comment]);
    expect(calls[0]?.values).toEqual([20]);
    expect(calls[0]?.query).toContain('approved = 1');
    expect(calls[0]?.query).toContain('ORDER BY created_at DESC');
    expect(calls[0]?.query).not.toContain('author_email');
  });
});

describe('listComments', () => {
  it('queries approved comments for the given keys, public columns only', async () => {
    const { db, calls } = fakeDb([comment]);
    expect(await listComments(db, ['about', 'x'])).toEqual([comment]);
    expect(calls[0]?.values).toEqual(['about', 'x']);
    expect(calls[0]?.query).toContain('approved = 1');
    expect(calls[0]?.query).not.toContain('author_email');
    expect(calls[0]?.query).not.toContain('*');
  });

  it('does not query without keys', async () => {
    const { db, calls } = fakeDb();
    expect(await listComments(db, [])).toEqual([]);
    expect(calls).toHaveLength(0);
  });
});

describe('addComment', () => {
  it('inserts with bound values and returns public columns only', async () => {
    const { db, calls } = fakeDb([comment]);
    const saved = await addComment(db, {
      page_slug: 'about',
      author_name: 'a',
      author_email: 'a@b.co',
      content: 'b',
    });
    expect(saved).toEqual(comment);
    expect(calls[0]?.values).toEqual(['about', 'a', 'a@b.co', 'b']);
    expect(calls[0]?.query).toMatch(/RETURNING id, page_slug, author_name, content/);
  });

  it('fails loudly if the insert returns nothing', async () => {
    const { db } = fakeDb([]);
    await expect(
      addComment(db, { page_slug: 'a', author_name: 'b', author_email: null, content: 'c' }),
    ).rejects.toThrow('Insert returned no row');
  });
});

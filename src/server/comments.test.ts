import { describe, expect, it } from 'vitest';
import {
  addComment,
  approvedCommentPage,
  listComments,
  listRecentComments,
  parseNewComment,
  parsePageKeys,
  replyRecipient,
  unsubscribeReplies,
  type CommentsDb,
  type PublicComment,
} from './comments';

/** Records the query and bound values; returns the given rows. */
function fakeDb(rows: object[] = []) {
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
  parent_id: null,
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
      parent_id: null,
      notify_replies: false,
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

  it('refuses names reserved for the admin', () => {
    expect(parseNewComment({ ...valid, author_name: 'מנהל האתר' })).toEqual({
      error: 'Reserved name',
    });
  });

  it('accepts a reply to another comment, and refuses a malformed parent', () => {
    expect(parseNewComment({ ...valid, parent_id: 7 })).toMatchObject({ parent_id: 7 });
    for (const parent_id of [0, -1, 1.5, '7', 'x']) {
      expect(parseNewComment({ ...valid, parent_id })).toEqual({ error: 'Invalid parent' });
    }
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

describe('approvedCommentPage', () => {
  it('finds the page of an approved comment only', async () => {
    const { db, calls } = fakeDb([comment]);
    expect(await approvedCommentPage(db, 1)).toBe('about');
    expect(calls[0]?.query).toContain('approved = 1');
    expect(await approvedCommentPage(fakeDb([]).db, 9)).toBeNull();
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
      parent_id: 3,
      notify_replies: false,
    });
    expect(saved).toEqual(comment);
    expect(calls[0]?.values).toEqual(['about', 'a', 'a@b.co', 'b', 3, 0, null]);
    expect(calls[0]?.query).toMatch(/RETURNING id, page_slug, author_name, content/);
  });

  it('fails loudly if the insert returns nothing', async () => {
    const { db } = fakeDb([]);
    await expect(
      addComment(db, {
        page_slug: 'a',
        author_name: 'b',
        author_email: null,
        content: 'c',
        parent_id: null,
        notify_replies: false,
      }),
    ).rejects.toThrow('Insert returned no row');
  });

  it('gives a comment that asked for reply emails a random unsubscribe token', async () => {
    const { db, calls } = fakeDb([comment]);
    const asking = {
      page_slug: 'a',
      author_name: 'b',
      author_email: 'b@c.co',
      content: 'c',
      parent_id: null,
    };
    await addComment(db, { ...asking, notify_replies: true });
    await addComment(db, { ...asking, notify_replies: true });
    const [first, second] = calls.map((call) => call.values);
    expect(first?.[5]).toBe(1);
    expect(first?.[6]).toMatch(/^[0-9a-f-]{36}$/);
    expect(second?.[6]).not.toBe(first?.[6]);
  });
});

describe('reply emails', () => {
  it('accepts "email me on replies" only together with an email', () => {
    const base = { page_slug: 'a', author_name: 'b', content: 'c', notify_replies: true };
    expect(parseNewComment({ ...base, author_email: 'b@c.co' })).toMatchObject({
      notify_replies: true,
    });
    expect(parseNewComment(base)).toMatchObject({ notify_replies: false });
    expect(
      parseNewComment({ ...base, author_email: 'b@c.co', notify_replies: 'yes' }),
    ).toMatchObject({
      notify_replies: false,
    });
  });

  it('finds the author to tell only if they asked and the comment is approved', async () => {
    const row = { author_name: 'דנה', author_email: 'd@e.co', unsubscribe_token: 't' };
    const { db, calls } = fakeDb([row]);
    expect(await replyRecipient(db, 7)).toEqual({
      name: 'דנה',
      email: 'd@e.co',
      unsubscribeToken: 't',
    });
    expect(calls[0]?.query).toMatch(/approved = 1 AND notify_replies = 1/);
    expect(calls[0]?.values).toEqual([7]);
    expect(await replyRecipient(fakeDb([]).db, 7)).toBeNull();
  });

  it('unsubscribes every comment of the address behind a token', async () => {
    const { db, calls } = fakeDb([{ author_email: 'd@e.co' }]);
    expect(await unsubscribeReplies(db, 'token')).toBe(true);
    expect(calls[1]?.query).toMatch(
      /SET notify_replies = 0 WHERE lower\(author_email\) = lower\(\?\)/,
    );
    expect(calls[1]?.values).toEqual(['d@e.co']);
    expect(await unsubscribeReplies(fakeDb([]).db, 'unknown')).toBe(false);
  });
});

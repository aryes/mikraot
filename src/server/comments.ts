/**
 * Comments stored in D1. Takes the database as a parameter (the Worker passes its `DB` binding),
 * so the logic is testable without the Workers runtime.
 */

/** The part of D1's API this module uses; the real `D1Database` binding satisfies it. */
export interface CommentsDb {
  prepare(query: string): {
    bind(...values: unknown[]): {
      // Mirrors D1's API: the caller states the row type it selected.
      // oxlint-disable-next-line typescript/no-unnecessary-type-parameters
      all<T>(): Promise<{ results: T[] }>;
      // oxlint-disable-next-line typescript/no-unnecessary-type-parameters
      first<T>(): Promise<T | null>;
    };
  };
}

/** A comment as shown to visitors. `author_email` is never returned. */
export interface PublicComment {
  id: number;
  page_slug: string;
  author_name: string;
  content: string;
  is_admin_reply: number;
  created_at: string;
}

export interface NewComment {
  page_slug: string;
  author_name: string;
  author_email: string | null;
  content: string;
}

const PUBLIC_COLUMNS = 'id, page_slug, author_name, content, is_admin_reply, created_at';
const MAX_KEYS = 10;
const LIMITS = { page_slug: 300, author_name: 100, author_email: 200, content: 5000 } as const;
/** Largest POST body accepted (bytes): the field limits plus JSON overhead, with room to spare. */
export const MAX_BODY_BYTES = 32_000;
/** A form field hidden from people; bots that fill in every field give themselves away. */
export const HONEYPOT_FIELD = 'website';

/** Page keys from the `page_slug` query parameter (comma-separated), deduplicated and capped. */
export function parsePageKeys(param: string | null): string[] {
  if (!param) return [];
  const keys = param
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0 && key.length <= LIMITS.page_slug);
  return [...new Set(keys)].slice(0, MAX_KEYS);
}

/** Validates a POST body. Returns the cleaned comment, or an error message for the client. */
export function parseNewComment(body: unknown): NewComment | { error: string } {
  const field = (name: string): string => {
    const value = body && typeof body === 'object' ? Reflect.get(body, name) : undefined;
    return typeof value === 'string' ? value.trim() : '';
  };
  const comment = {
    page_slug: field('page_slug'),
    author_name: field('author_name'),
    author_email: field('author_email'),
    content: field('content'),
  };

  if (field(HONEYPOT_FIELD)) return { error: 'Rejected' };
  if (!comment.page_slug || !comment.author_name || !comment.content) {
    return { error: 'Missing required fields' };
  }
  for (const name of ['page_slug', 'author_name', 'author_email', 'content'] as const) {
    if (comment[name].length > LIMITS[name]) return { error: `${name} is too long` };
  }
  if (comment.author_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(comment.author_email)) {
    return { error: 'Invalid email' };
  }
  return { ...comment, author_email: comment.author_email || null };
}

export async function listComments(db: CommentsDb, pageKeys: string[]): Promise<PublicComment[]> {
  if (pageKeys.length === 0) return [];
  const placeholders = pageKeys.map(() => '?').join(',');
  const { results } = await db
    .prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM comments
       WHERE page_slug IN (${placeholders}) AND approved = 1
       ORDER BY created_at ASC`,
    )
    .bind(...pageKeys)
    .all<PublicComment>();
  return results;
}

/** Stores a comment. New comments are approved immediately, as on the current site. */
export async function addComment(db: CommentsDb, comment: NewComment): Promise<PublicComment> {
  const saved = await db
    .prepare(
      `INSERT INTO comments (page_slug, author_name, author_email, content, is_admin_reply, approved)
       VALUES (?, ?, ?, ?, 0, 1)
       RETURNING ${PUBLIC_COLUMNS}`,
    )
    .bind(comment.page_slug, comment.author_name, comment.author_email, comment.content)
    .first<PublicComment>();
  if (!saved) throw new Error('Insert returned no row');
  return saved;
}

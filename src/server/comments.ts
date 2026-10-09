/**
 * Comments stored in D1. Takes the database as a parameter (the Worker passes its `DB` binding),
 * so the logic is testable without the Workers runtime.
 */

import { isReservedName } from '../lib/reserved-names';

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
  /** The comment this one replies to; null for a top-level comment. */
  parent_id: number | null;
  created_at: string;
}

export interface NewComment {
  page_slug: string;
  author_name: string;
  author_email: string | null;
  content: string;
  parent_id: number | null;
  /** Email the author when someone replies (only with an email). */
  notify_replies: boolean;
}

const PUBLIC_COLUMNS = 'id, page_slug, author_name, content, is_admin_reply, parent_id, created_at';
const MAX_KEYS = 10;
const LIMITS = { page_slug: 300, author_name: 100, author_email: 200, content: 5000 } as const;
/** Largest POST body accepted (bytes): the field limits plus JSON overhead, with room to spare. */
export const MAX_BODY_BYTES = 32_000;
/** A form field hidden from people; bots that fill in every field give themselves away. */
const HONEYPOT_FIELD = 'website';

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
  if (isReservedName(comment.author_name)) return { error: 'Reserved name' };
  if (!comment.page_slug || !comment.author_name || !comment.content) {
    return { error: 'Missing required fields' };
  }
  for (const name of ['page_slug', 'author_name', 'author_email', 'content'] as const) {
    if (comment[name].length > LIMITS[name]) return { error: `${name} is too long` };
  }
  if (comment.author_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(comment.author_email)) {
    return { error: 'Invalid email' };
  }
  const parent = body && typeof body === 'object' ? Reflect.get(body, 'parent_id') : undefined;
  if (
    parent !== undefined &&
    parent !== null &&
    !(Number.isSafeInteger(parent) && Number(parent) > 0)
  ) {
    return { error: 'Invalid parent' };
  }
  const notify = body && typeof body === 'object' ? Reflect.get(body, 'notify_replies') : undefined;
  return {
    ...comment,
    author_email: comment.author_email || null,
    parent_id: typeof parent === 'number' ? parent : null,
    notify_replies: notify === true && comment.author_email !== '',
  };
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

/** The newest approved comments on the whole site, newest first (for the comments feed). */
export async function listRecentComments(db: CommentsDb, limit: number): Promise<PublicComment[]> {
  const { results } = await db
    .prepare(
      `SELECT ${PUBLIC_COLUMNS} FROM comments
       WHERE approved = 1
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all<PublicComment>();
  return results;
}

/** The page key of an approved comment (to check that a reply is on the same page), or null. */
export async function approvedCommentPage(db: CommentsDb, id: number): Promise<string | null> {
  const row = await db
    .prepare('SELECT page_slug FROM comments WHERE id = ? AND approved = 1')
    .bind(id)
    .first<{ page_slug: string }>();
  return row?.page_slug ?? null;
}

/**
 * Stores a comment. New comments are approved immediately, as on the current site. A comment whose
 * author asked for reply emails gets a random unsubscribe token for the links in them.
 */
export async function addComment(db: CommentsDb, comment: NewComment): Promise<PublicComment> {
  const saved = await db
    .prepare(
      `INSERT INTO comments
         (page_slug, author_name, author_email, content, parent_id, is_admin_reply, approved,
          notify_replies, unsubscribe_token)
       VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?)
       RETURNING ${PUBLIC_COLUMNS}`,
    )
    .bind(
      comment.page_slug,
      comment.author_name,
      comment.author_email,
      comment.content,
      comment.parent_id,
      comment.notify_replies ? 1 : 0,
      comment.notify_replies ? crypto.randomUUID() : null,
    )
    .first<PublicComment>();
  if (!saved) throw new Error('Insert returned no row');
  return saved;
}

/** Who to tell about a reply: the author of the comment replied to, if they asked to be told. */
export interface ReplyRecipient {
  name: string;
  email: string;
  unsubscribeToken: string;
}

export async function replyRecipient(
  db: CommentsDb,
  parentId: number,
): Promise<ReplyRecipient | null> {
  const row = await db
    .prepare(
      `SELECT author_name, author_email, unsubscribe_token FROM comments
       WHERE id = ? AND approved = 1 AND notify_replies = 1
         AND author_email IS NOT NULL AND unsubscribe_token IS NOT NULL`,
    )
    .bind(parentId)
    .first<{ author_name: string; author_email: string; unsubscribe_token: string }>();
  return row
    ? { name: row.author_name, email: row.author_email, unsubscribeToken: row.unsubscribe_token }
    : null;
}

/**
 * Stops reply emails to the address behind an unsubscribe token: for all of that address's
 * comments, since one click should mean "no more of these". Returns false for an unknown token.
 */
export async function unsubscribeReplies(db: CommentsDb, token: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT author_email FROM comments WHERE unsubscribe_token = ?')
    .bind(token)
    .first<{ author_email: string | null }>();
  if (!row?.author_email) return false;
  await db
    .prepare('UPDATE comments SET notify_replies = 0 WHERE lower(author_email) = lower(?)')
    .bind(row.author_email)
    .all();
  return true;
}

/** Browser client for the site's comments API (served by the same Worker at /api). */
import type { PublicComment } from '../server/comments';

export type CommentItem = PublicComment;

export async function fetchComments(pageKeys: string[]): Promise<CommentItem[]> {
  try {
    const res = await fetch(`/api/comments/?page_slug=${encodeURIComponent(pageKeys.join(','))}`);
    if (!res.ok) throw new Error(`Failed to fetch comments: ${res.status}`);
    const data: CommentItem[] = await res.json();
    return data;
  } catch (err) {
    console.error('[API] Error loading comments:', err);
    return [];
  }
}

/** A refused or failed comment post, with the HTTP status. */
export class CommentError extends Error {
  constructor(readonly status: number) {
    super(`Failed to submit comment: ${status}`);
  }
}

export async function postComment(comment: {
  page_slug: string;
  author_name: string;
  author_email?: string | undefined;
  content: string;
  /** The hidden anti-spam field; people leave it empty. */
  website: string;
  /** Proof from the Turnstile widget that a person is posting. */
  turnstile_token: string;
  /** The comment this one replies to, if any. */
  parent_id?: number | undefined;
  /** Email the author when someone replies (only with an email). */
  notify_replies?: boolean | undefined;
}): Promise<CommentItem> {
  const res = await fetch('/api/comments/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(comment),
  });
  if (!res.ok) throw new CommentError(res.status);
  return await res.json();
}

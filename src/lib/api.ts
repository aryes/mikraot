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

export async function postComment(comment: {
  page_slug: string;
  author_name: string;
  author_email?: string | undefined;
  content: string;
  /** The hidden anti-spam field; people leave it empty. */
  website: string;
}): Promise<CommentItem> {
  const res = await fetch('/api/comments/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(comment),
  });
  if (!res.ok) throw new Error(`Failed to submit comment: ${res.status}`);
  return await res.json();
}

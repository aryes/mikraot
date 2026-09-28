// Cloudflare D1 & Worker API Client for Mikraot.net

const API_BASE = 'https://mikraot.net/api';

export interface CommentItem {
  id: number;
  page_slug: string;
  author_name: string;
  author_email?: string;
  content: string;
  is_admin_reply: number | boolean;
  approved: number | boolean;
  created_at: string;
}

export async function fetchComments(candidateSlugs: string[]): Promise<CommentItem[]> {
  try {
    const slugParam = encodeURIComponent(candidateSlugs.join(','));
    const res = await fetch(`${API_BASE}/comments?page_slug=${slugParam}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch comments: ${res.status}`);
    }
    const data: CommentItem[] = await res.json();
    return data || [];
  } catch (err) {
    console.error('[API] Error loading comments from Cloudflare D1:', err);
    return [];
  }
}

export async function postComment(comment: {
  page_slug: string;
  author_name: string;
  author_email?: string;
  content: string;
}): Promise<CommentItem> {
  const res = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(comment),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to submit comment: ${res.status}`);
  }

  return await res.json();
}

/**
 * The comment management link in the owner's new-comment email: it opens
 * src/pages/comments/manage.astro, where the comment can be hidden or shown again. Signed with its
 * own secret (COMMENT_MANAGE_SECRET), so a leak of another key can't forge it, and it names one
 * comment only. It doesn't expire (Arye, 2026-10-19): an old email still manages its comment, and
 * anything it does can be undone.
 */
import { readToken, signToken } from './signing';

const PURPOSE = 'comment-manage';

export const manageToken = (secret: string, id: number): Promise<string> =>
  signToken(secret, PURPOSE, String(id));

/** The comment a token was made for, or null if it isn't one of ours. */
export async function commentIdFromToken(secret: string, token: string): Promise<number | null> {
  const value = await readToken(secret, PURPOSE, token);
  return value !== null && /^\d+$/.test(value) ? Number(value) : null;
}

export const manageUrl = async (secret: string, origin: string, id: number): Promise<string> => {
  const url = new URL('/comments/manage/', origin);
  url.searchParams.set('token', await manageToken(secret, id));
  return url.href;
};

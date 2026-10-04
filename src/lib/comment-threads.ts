/** Comments arranged as threads: top-level comments, each with its replies (as on WordPress). */

interface ThreadComment {
  id: number;
  parent_id: number | null;
}

export interface Threads<T extends ThreadComment> {
  /** Comments that answer no other shown comment, in their original order. */
  roots: T[];
  /** Replies to each comment, in their original order. */
  replies: (comment: T) => T[];
}

export function buildThreads<T extends ThreadComment>(comments: T[]): Threads<T> {
  const ids = new Set(comments.map((comment) => comment.id));
  const byParent = new Map<number, T[]>();
  const roots: T[] = [];
  for (const comment of comments) {
    // A reply whose parent isn't shown (e.g. not approved) is shown at the top level.
    if (comment.parent_id !== null && ids.has(comment.parent_id)) {
      byParent.set(comment.parent_id, [...(byParent.get(comment.parent_id) ?? []), comment]);
    } else {
      roots.push(comment);
    }
  }
  return { roots, replies: (comment) => byParent.get(comment.id) ?? [] };
}

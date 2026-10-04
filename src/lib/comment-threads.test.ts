import { describe, expect, it } from 'vitest';
import { buildThreads } from './comment-threads';

const c = (id: number, parent_id: number | null = null) => ({ id, parent_id });

describe('buildThreads', () => {
  it('nests replies under the comment they answer, keeping order', () => {
    const comments = [c(1), c(2, 1), c(3), c(4, 1), c(5, 2)];
    const { roots, replies } = buildThreads(comments);
    expect(roots.map((x) => x.id)).toEqual([1, 3]);
    expect(replies(c(1)).map((x) => x.id)).toEqual([2, 4]);
    expect(replies(c(2)).map((x) => x.id)).toEqual([5]);
    expect(replies(c(3))).toEqual([]);
  });

  it('shows a reply to a comment that is not shown at the top level', () => {
    expect(buildThreads([c(7, 99)]).roots.map((x) => x.id)).toEqual([7]);
  });
});

import { describe, expect, it } from 'vitest';
import { adjacentPosts, relatedPosts, type NavPost } from './post-nav';

const post = (n: number, categories: string[] = ['news']): NavPost => ({
  url: `/p${n}/`,
  title: `Post ${n}`,
  date: new Date(2021, 0, n),
  categories,
});
const posts = [post(3), post(1), post(2, ['other']), post(4)];

describe('adjacentPosts', () => {
  it('finds the older and newer posts by date', () => {
    const { previous, next } = adjacentPosts(posts, '/p2/');
    expect([previous?.url, next?.url]).toEqual(['/p1/', '/p3/']);
  });

  it('has nothing beyond the first and last post', () => {
    expect(adjacentPosts(posts, '/p1/').previous).toBeUndefined();
    expect(adjacentPosts(posts, '/p4/').next).toBeUndefined();
    expect(adjacentPosts([post(1)], '/p1/')).toEqual({ previous: undefined, next: undefined });
  });
});

describe('relatedPosts', () => {
  it('lists other posts in the same category, newest first', () => {
    expect(relatedPosts(posts, post(3)).map((p) => p.url)).toEqual(['/p4/', '/p1/']);
  });

  it('is empty when no other post shares a category', () => {
    expect(relatedPosts(posts, post(2, ['other']))).toEqual([]);
  });
});

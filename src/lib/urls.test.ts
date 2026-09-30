import { describe, expect, it } from 'vitest';
import type { ContentItem, MenuItem } from '../types';
import { isPublicPage, menuItemUrl, pathSegmentsFor, urlForPath } from './urls';

const item = (overrides: Partial<ContentItem>): ContentItem => ({
  id: 1,
  title: 'Title',
  slug: 'slug',
  rawSlug: 'slug',
  type: 'page',
  status: 'publish',
  content: '',
  excerpt: '',
  parentId: 0,
  order: 0,
  ...overrides,
});

const menu = (url: string): MenuItem => ({ id: 1, title: 'x', url, parentId: 0, order: 0 });

describe('pathSegmentsFor', () => {
  const parent = item({ id: 213, slug: 'טעמים' });
  const child = item({ id: 215, slug: 'נוסח-אשכנז', parentId: 213 });
  const byId = new Map([parent, child].map((i) => [i.id, i]));

  it('gives the front page an empty path', () => {
    expect(pathSegmentsFor(item({ id: 4 }), byId, '4')).toBe('');
  });

  it('nests pages under their parents like WordPress hierarchical permalinks', () => {
    expect(pathSegmentsFor(child, byId, '4')).toBe('טעמים/נוסח-אשכנז');
  });

  it('prefixes LearnPress types', () => {
    expect(pathSegmentsFor(item({ type: 'lp_course', slug: 'c' }), byId, '4')).toBe('courses/c');
    expect(pathSegmentsFor(item({ type: 'lp_lesson', slug: 'l' }), byId, '4')).toBe('lessons/l');
    expect(pathSegmentsFor(item({ type: 'lp_quiz', slug: 'q' }), byId, '4')).toBe('quizzes/q');
  });

  it('does not nest posts', () => {
    expect(pathSegmentsFor(item({ type: 'post', slug: 'p', parentId: 213 }), byId, '4')).toBe('p');
  });

  it('survives a parent cycle', () => {
    const a = item({ id: 1, slug: 'a', parentId: 2 });
    const b = item({ id: 2, slug: 'b', parentId: 1 });
    const cyclic = new Map([a, b].map((i) => [i.id, i]));
    expect(pathSegmentsFor(a, cyclic, '4')).toBe('b/a');
  });
});

describe('isPublicPage', () => {
  it('keeps published pages and excludes drafts and quiz questions', () => {
    expect(isPublicPage(item({}))).toBe(true);
    expect(isPublicPage(item({ status: 'draft' }))).toBe(false);
    expect(isPublicPage(item({ type: 'lp_question' }))).toBe(false);
  });
});

describe('urlForPath', () => {
  it('adds slashes like WordPress', () => {
    expect(urlForPath('')).toBe('/');
    expect(urlForPath('a/b')).toBe('/a/b/');
  });
});

describe('menuItemUrl', () => {
  it('returns null for menu items without a link', () => {
    expect(menuItemUrl(menu(''))).toBeNull();
  });

  it('strips the staging prefix and decodes Hebrew paths', () => {
    expect(menuItemUrl(menu('https://mikraot.net/staging/4160/%d7%9e%d7%91%d7%98%d7%90/'))).toBe(
      '/מבטא/',
    );
  });

  it('keeps external links unchanged', () => {
    expect(menuItemUrl(menu('https://www.youtube.com/@x'))).toBe('https://www.youtube.com/@x');
  });
});

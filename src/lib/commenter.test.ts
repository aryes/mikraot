import { describe, expect, it } from 'vitest';
import { loadCommenter, rememberCommenter } from './commenter';

function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe('commenter memory', () => {
  it('remembers name and email only when asked, and forgets them when unticked', () => {
    const store = memoryStore();
    expect(loadCommenter(store)).toBeNull();
    rememberCommenter({ name: 'דנה', email: 'd@example.com' }, true, store);
    expect(loadCommenter(store)).toEqual({ name: 'דנה', email: 'd@example.com' });
    rememberCommenter({ name: 'דנה', email: 'd@example.com' }, false, store);
    expect(loadCommenter(store)).toBeNull();
  });

  it('ignores damaged data and storage that throws', () => {
    const store = memoryStore();
    store.setItem('mikraot:commenter', '{not json');
    expect(loadCommenter(store)).toBeNull();
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    expect(loadCommenter(blocked)).toBeNull();
    expect(() => rememberCommenter({ name: 'a', email: '' }, true, blocked)).not.toThrow();
  });
});

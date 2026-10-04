/**
 * The commenter's name and email, kept in their own browser when they ask for it (the comment
 * form's "remember me" checkbox, as on WordPress). Nothing is sent anywhere.
 */

const KEY = 'mikraot:commenter';

export interface Commenter {
  name: string;
  email: string;
}

/** Storage may be missing or blocked (private mode, disabled site data): then nothing is kept. */
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const browserStore = (): Store | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};

export function loadCommenter(store: Store | undefined = browserStore()): Commenter | null {
  try {
    const value: unknown = JSON.parse(store?.getItem(KEY) ?? 'null');
    if (value && typeof value === 'object') {
      const name = Reflect.get(value, 'name');
      const email = Reflect.get(value, 'email');
      if (typeof name === 'string' && typeof email === 'string') return { name, email };
    }
  } catch {
    // Unreadable or blocked: as if nothing was saved.
  }
  return null;
}

/** Saves the details when `remember` is on, and forgets them when it is off. */
export function rememberCommenter(
  commenter: Commenter,
  remember: boolean,
  store: Store | undefined = browserStore(),
): void {
  try {
    if (remember) store?.setItem(KEY, JSON.stringify(commenter));
    else store?.removeItem(KEY);
  } catch {
    // Storage full or blocked: the form still works, it just won't remember.
  }
}

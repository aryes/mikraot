import { describe, expect, it } from 'vitest';
import { isReservedName } from './reserved-names';

describe('isReservedName', () => {
  it.each(['מנהל האתר', 'מנהל-האתר', ' מְנַהֵל הָאֲתָר ', 'Admin', 'ADMIN.', 'מקראות'])(
    'refuses %s',
    (name) => expect(isReservedName(name)).toBe(true),
  );

  it.each(['אריה', 'מנהל בית ספר', 'Adminton', 'מקראות שלי'])('allows %s', (name) =>
    expect(isReservedName(name)).toBe(false),
  );
});

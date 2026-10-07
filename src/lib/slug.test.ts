import { describe, expect, it } from 'vitest';
import { slugFromTitle } from './slug';

describe('slugFromTitle', () => {
  it('matches the addresses WordPress gave the existing pages', () => {
    expect(slugFromTitle('ה׳ הידיעה וה׳ השאלה')).toBe('ה-הידיעה-וה-השאלה');
    expect(slugFromTitle('מש״ה מוציא וכל״ב מכניס')).toBe('משה-מוציא-וכלב-מכניס');
    expect(slugFromTitle('תנועות, עיצורים וניקוד')).toBe('תנועות-עיצורים-וניקוד');
    expect(slugFromTitle('טעמים בנוסח בבלי/עירקי')).toBe('טעמים-בנוסח-בבלי-עירקי');
    expect(slugFromTitle('שיטת "גלגלי עזר"')).toBe('שיטת-גלגלי-עזר');
  });

  it('drops vowel points and cantillation marks; a maqaf joins like a hyphen', () => {
    expect(slugFromTitle('פַּשְׁטָא֙ זָקֵף־קָטָ֔ן')).toBe('פשטא-זקף-קטן');
    expect(slugFromTitle('ויאמר׀משה׃')).toBe('ויאמר-משה');
  });

  it('keeps Latin letters and digits, lower case', () => {
    expect(slugFromTitle('Trope Hierarchy 2')).toBe('trope-hierarchy-2');
  });
});

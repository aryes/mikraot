import { describe, expect, it } from 'vitest';
import { dageshGroup, verseDageshItems } from './dagesh-words';
import { lettersOf } from './shva-words';

/** Each dagesh of a word that the rules settle, as "group: its letter". */
const groups = (word: string, closedBefore = true) => {
  const letters = lettersOf(word);
  return letters.flatMap((letter, i) => {
    const group = dageshGroup(letters, i, closedBefore);
    return group ? [`${group}: ${letter.letter}`] : [];
  });
};

describe('dageshGroup', () => {
  it('names a דגש קל: a בג״ד כפ״ת starting a word, or after a שווא נח', () => {
    expect(groups('בְּרֵאשִׁית')).toEqual(['קל-ראש: ב']);
    expect(groups('יִכְתְּבוּ')).toEqual(['קל-שווא: ת']);
    expect(groups('הִרְבִּיץ')).toEqual(['קל-שווא: ב']);
  });

  it('names a דגש חזק: a בג״ד כפ״ת after a vowel, or another letter', () => {
    expect(groups('חִבּוּר')).toEqual(['חזק-תנועה: ב']);
    expect(groups('שִׁלֵּם')).toEqual(['חזק-אות: ל']);
  });

  it("leaves out what the rules don't settle", () => {
    // After an open syllable (a דחיק, or no dagesh); a word's last letter; a שורוק.
    expect(groups('בְּרֵאשִׁית', false)).toEqual([]);
    expect(groups('אַתְּ')).toEqual([]);
    expect(groups('הוּא')).toEqual([]);
    // After a shva that starts the word (נע); the בָּתִּים exception.
    expect(groups('שְׁתַּיִם')).toEqual([]);
    expect(groups('בָּתִּים')).toEqual(['קל-ראש: ב']);
  });
});

describe('verseDageshItems', () => {
  it('starts a verse after a closed syllable, and looks at the word before', () => {
    const answers = verseDageshItems('בְּרֵאשִׁ֖ית בָּרָ֣א').map(({ answer, item }) => [
      answer,
      item.w,
    ]);
    expect(answers).toEqual([
      ['קל-ראש', 'בְּרֵאשִׁית'],
      ['קל-ראש', 'בָּרָא'],
    ]);
    // After a word ending in a vowel, a בג״ד כפ״ת starting the next isn't asked.
    expect(verseDageshItems('אָ֣מְרוּ בָּ֔ם').map(({ item }) => item.w)).toEqual([]);
  });
});

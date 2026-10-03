// Markdoc is CommonJS: under Node only its default export exists, so members are used through it.
// oxlint-disable import/no-named-as-default-member
import Markdoc from '@markdoc/markdoc';
import { describe, expect, it } from 'vitest';
import { markPointed } from './pointed-markdoc';

const { Tag } = Markdoc;
const html = (tag: InstanceType<typeof Tag>) => Markdoc.renderers.html(markPointed(tag));

describe('markPointed', () => {
  it('wraps pointed runs and leaves plain text as it is', () => {
    expect(html(new Tag('p', {}, ['למשל: וְהָאָ֗רֶץ - הטעם']))).toBe(
      '<p>למשל: <span class="pointed">וְהָאָ֗רֶץ</span> - הטעם</p>',
    );
  });

  it('marks a word whose letters are in different elements (a coloured letter)', () => {
    const p = new Tag('p', {}, [
      'ה',
      new Tag('span', { class: 'mark-highlight' }, ['ַבַּ']),
      'יִת',
    ]);
    expect(html(p)).toBe(
      '<p><span class="pointed">ה</span><span class="mark-highlight"><span class="pointed">ַבַּ</span></span><span class="pointed">יִת</span></p>',
    );
  });

  it('leaves nested blocks to mark themselves', () => {
    const inner = new Tag('ul', {}, [new Tag('li', {}, ['בָּרָא'])]);
    const li = new Tag('li', {}, ['רשימה', inner]);
    expect(html(li)).toBe('<li>רשימה<ul><li>בָּרָא</li></ul></li>');
  });
});

import { parse, renderers, transform } from '@markdoc/markdoc';
import { describe, expect, it } from 'vitest';
import { td, thead } from './markdoc-tables.mjs';

const config = {
  nodes: { td, thead },
  tags: {
    audio: {
      render: 'audio-button',
      attributes: { src: { type: String }, label: { type: String } },
      selfClosing: true,
    },
  },
};

const render = (source: string) => renderers.html(transform(parse(source), config));

const table = (heads: string[], cells: string[]) =>
  `{% table %}\n${heads.map((h) => `- ${h}`).join('\n')}\n---\n${cells.map((c) => `- ${c}`).join('\n')}\n{% /table %}\n`;

const headRows = (source: string) =>
  [...render(source).matchAll(/<tr>(.*?)<\/tr>/g)]
    .map((row) => row[1] ?? '')
    .filter((row) => row.includes('<th'));

const cell = (content: string) => {
  const html = render(table(['a'], [content]));
  return /<td[^>]*>.*?<\/td>/s.exec(html)?.[0];
};

describe('grouped table headings', () => {
  it('groups adjacent headings that share a first word, the rest spanning both rows', () => {
    const rows = headRows(
      table(['**האות**', '**מקבילות אנגלית**', '**מקבילות ערבית**', 'הצליל'], ['א', 'a', 'ا', 'x']),
    );
    expect(rows).toEqual([
      '<th rowspan="2" scope="col"><strong>האות</strong></th><th colspan="2" scope="col">מקבילות</th><th rowspan="2" scope="col">הצליל</th>',
      '<th scope="col">אנגלית</th><th scope="col">ערבית</th>',
    ]);
  });

  it('groups three or more, and leaves one-word and unrelated headings alone', () => {
    const [top] = headRows(table(['תנועה גדולה', 'תנועה קטנה', 'תנועה חטופה'], ['a', 'b', 'c']));
    expect(top).toBe('<th colspan="3" scope="col">תנועה</th>');
    expect(headRows(table(['האות', 'המילים', 'האות דגושה?'], ['a', 'b', 'c']))).toHaveLength(1);
  });
});

describe('letter table cells', () => {
  it('makes a letter with its recording one button labelled with the letter', () => {
    expect(cell('בּ {% audio src="/b.mp3" /%}')).toBe(
      '<td><audio-button src="/b.mp3" label="בּ"></audio-button></td>',
    );
  });

  it('draws letters alone large: Hebrew, Arabic, one or two English letters', () => {
    for (const letters of ['בּ', 'غ', 'ס / שׂ', 'b', 'sh']) {
      expect(cell(letters)).toMatch(/^<td class="cell-letter">/);
    }
    for (const words of ['פרק', 'abc', 'קמץ']) {
      expect(cell(words)).toMatch(/^<td>/);
    }
  });

  it('draws a trope shown on א large too, with its sof pasuk, pasek or second letter', () => {
    for (const signs of ['א֖', 'אֽ׃', 'א֣׀', 'א֙א֙', 'א֨ א֜']) {
      expect(cell(signs)).toMatch(/^<td class="cell-letter">/);
    }
    // Two-letter words and words with a pasek stay text.
    for (const words of ['לֹא', 'מִי', 'לְךָ', 'גַּם ׀']) {
      expect(cell(words)).toMatch(/^<td>/);
    }
  });

  it('puts an English example under its letters, its English words marked', () => {
    expect(cell('th כמו במילה the')).toBe(
      '<td class="cell-letter">th <span class="cell-example">כמו במילה <span class="latin">the</span></span></td>',
    );
  });
});

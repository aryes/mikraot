/**
 * Builds the rows of choices of each list picker (src/components/content/ListPicker.astro) from
 * its nested list: one row per depth, each choice a button opening the next row, and the deepest
 * items as links. A choice that is alone in its row is opened right away (ויקרא has one parasha).
 */

interface Item {
  name: string;
  href: string | null;
  children: Item[];
}

/**
 * The list's items; an item without a link or children (a book with no recordings yet) is left out.
 * An item's text is in a <p> when the list is loose (blank lines between items in the editor).
 */
function readList(list: Element): Item[] {
  return [...list.children].flatMap((li) => {
    const own = li.querySelector(':scope > p') ?? li;
    const link = own.querySelector(':scope > a');
    const sublist = li.querySelector(':scope > ul');
    const children = sublist ? readList(sublist) : [];
    const ownText = [...own.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join('');
    const name = (link?.textContent ?? ownText).trim();
    if (!name || (!link && children.length === 0)) return [];
    return [{ name, href: link?.getAttribute('href') ?? null, children }];
  });
}

function depthOf(items: Item[]): number {
  return Math.max(0, ...items.map((item) => 1 + depthOf(item.children)));
}

function setUp(picker: HTMLElement, index: number): void {
  const list = picker.querySelector(':scope > ul');
  if (!list) return;
  const items = readList(list);
  const levels = (picker.dataset['levels'] ?? '').split(',').map((level) => level.trim());
  const chapters = picker.dataset['chapters'] ?? '';
  const lastDepth = depthOf(items) - 1;
  const rows = document.createElement('div');
  rows.className = 'list-picker-rows';

  /** Shows the row of `options` at `depth`, below `path` (the names chosen above it). */
  function showRow(options: Item[], depth: number, path: string[], all: string | null): void {
    [...rows.children].slice(depth).forEach((row) => row.remove());
    const row = document.createElement('div');
    row.className = 'list-picker-row';
    const onlyLinks = options.every((option) => option.children.length === 0);
    const name = (onlyLinks && depth < lastDepth && chapters) || levels[depth] || '';
    // The label column stays even when empty, so the rows' choices line up.
    const label = document.createElement('span');
    label.className = 'list-picker-label';
    label.textContent = name;
    if (name) {
      label.id = `list-picker-${index}-${depth}`;
      row.setAttribute('role', 'group');
      row.setAttribute('aria-labelledby', label.id);
    }
    const choices = document.createElement('div');
    choices.className = 'list-picker-choices';
    row.append(label, choices);

    const buttons: HTMLButtonElement[] = [];
    for (const option of options) {
      if (option.children.length > 0) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'list-picker-choice';
        button.textContent = option.name;
        button.setAttribute('aria-expanded', 'false');
        button.addEventListener('click', () => {
          buttons.forEach((other) => other.setAttribute('aria-expanded', 'false'));
          button.setAttribute('aria-expanded', 'true');
          showRow(option.children, depth + 1, [...path, option.name], option.href);
        });
        buttons.push(button);
        choices.append(button);
      } else if (option.href) {
        choices.append(readingLink(option.name, name, option.href, [...path, option.name]));
      }
    }
    // The chosen item's own link (a book's or parasha's YouTube playlist) comes after its readings.
    if (all) choices.append(playlistLink(all, path));
    rows.append(row);

    const [only] = buttons;
    if (only && buttons.length === 1) only.click();
  }

  showRow(items, 0, [], null);
  list.replaceWith(rows);
  picker.classList.add('is-ready');
}

/**
 * A reading (or the whole playlist), shown without the row's name it repeats ("א" in the row
 * "פרק", read out in full; the play mark is drawn by the CSS). src/scripts/content.ts opens it in
 * the video popup, titled with its path without the top row ("במדבר · קרח · ראשון").
 */
function readingLink(
  name: string,
  rowName: string,
  href: string,
  path: string[],
): HTMLAnchorElement {
  const anchor = externalLink(href);
  anchor.className = 'list-picker-link';
  const shown = rowName && name.startsWith(`${rowName} `) ? name.slice(rowName.length + 1) : name;
  if (shown !== name) anchor.setAttribute('aria-label', name);
  anchor.dataset['videoTitle'] = path.slice(path.length > 1 ? 1 : 0).join(' · ');
  anchor.textContent = shown;
  return anchor;
}

/** The chosen item's whole playlist, styled and played as its readings are. */
function playlistLink(href: string, path: string[]): HTMLAnchorElement {
  return readingLink('הכול ברצף', '', href, path);
}

function externalLink(href: string): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.href = href;
  if (/^https?:\/\//.test(href)) {
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
  }
  return anchor;
}

document.querySelectorAll<HTMLElement>('.list-picker').forEach(setUp);

import { describe, expect, it } from 'vitest';
import { lastChanged, type Git } from './last-changed';

const page = (settings: string, text: string) => `---\ntitle: מדיניות\n${settings}---\n\n${text}\n`;

/** A file's history, newest first: each commit's date and content. */
type History = { date: string; content: string }[];

/** A fake git over a history; records the commands asked. */
function fakeGit(history: History, shallow = false) {
  const calls: string[] = [];
  const git: Git = (args) => {
    calls.push(args.join(' '));
    if (args[0] === 'rev-parse') return String(shallow);
    if (args[0] === 'log') return history.map((c, i) => `h${i} ${c.date}`).join('\n');
    if (args[0] === 'show')
      return history[Number(args[1]!.slice(1, args[1]!.indexOf(':')))]!.content;
    return '';
  };
  return { git, calls };
}

const v1 = page('', 'הנוסח הראשון');
const v2 = page('', 'הנוסח השני');
const history: History = [
  // Newest: only the settings changed (an SEO description), so it doesn't count.
  { date: '2026-10-08T10:00:00+03:00', content: page('seo:\n  description: חדש\n', 'הנוסח השני') },
  { date: '2026-10-06T10:00:00+03:00', content: v2 },
  { date: '2026-10-01T10:00:00+03:00', content: v1 },
];
const now = new Date('2026-10-09T12:00:00Z');

describe('lastChanged', () => {
  it('is the date of the last commit that changed the text, not just the settings', () => {
    const { git } = fakeGit(history);
    const date = lastChanged('page.mdoc', { git, read: () => history[0]!.content, now });
    expect(date.toISOString()).toBe('2026-10-06T07:00:00.000Z');
  });

  it("is the first commit's date when the text never changed after it", () => {
    const { git } = fakeGit([history[2]!]);
    expect(lastChanged('page.mdoc', { git, read: () => v1, now }).toISOString()).toBe(
      '2026-10-01T07:00:00.000Z',
    );
  });

  it('fetches the history first when the clone has only the latest commit', () => {
    const { git, calls } = fakeGit(history, true);
    lastChanged('page.mdoc', { git, read: () => history[0]!.content, now });
    expect(calls).toContain('fetch --unshallow --quiet');
  });

  it('is today while the text has uncommitted edits, or the page is new', () => {
    expect(lastChanged('page.mdoc', { git: fakeGit(history).git, read: () => v1, now })).toBe(now);
    expect(lastChanged('page.mdoc', { git: fakeGit([]).git, read: () => v1, now })).toBe(now);
  });

  it('fails an automatic build with uncommitted edits, rather than show a wrong date', () => {
    const { git } = fakeGit(history);
    expect(() => lastChanged('page.mdoc', { git, read: () => v1, now, inBuild: true })).toThrow(
      /uncommitted/,
    );
  });
});

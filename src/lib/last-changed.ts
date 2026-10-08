import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export type Git = (args: string[]) => string;

export interface Sources {
  git: Git;
  /** The file as it is now, in the working tree. */
  read: (file: string) => string;
  now: Date;
  /** True in automatic builds (CI, Cloudflare), where an uncommitted edit means a broken build. */
  inBuild: boolean;
}

const defaults = (): Sources => ({
  git: (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 << 20 }).trim(),
  read: (file) => readFileSync(file, 'utf8'),
  now: new Date(),
  inBuild: Boolean(process.env['CI'] || process.env['WORKERS_CI']),
});

let historyChecked = false;

/** A content file's text without its frontmatter (title, SEO and other settings). */
const bodyOf = (file: string) => file.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\n/, '');

/**
 * When a page's text last changed: the date of the newest commit that changed the file's body
 * (frontmatter-only commits, such as a new SEO description, don't count), or the build's date
 * while the body has uncommitted edits (a local preview). Used for "last updated" lines, so they
 * move only when the text changes, not on every deploy.
 *
 * Cloudflare's builds may clone only the latest commit, which would date every file to that
 * commit; the history is then fetched first (the repository is public). Without git, or with
 * uncommitted edits in an automatic build, the build fails rather than show a wrong date.
 */
export function lastChanged(file: string, sources: Partial<Sources> = {}): Date {
  const { git, read, now, inBuild } = { ...defaults(), ...sources };
  if (!historyChecked) {
    if (git(['rev-parse', '--is-shallow-repository']) === 'true') {
      git(['fetch', '--unshallow', '--quiet']);
    }
    historyChecked = !sources.git;
  }
  const commits = git(['log', '--format=%H %cI', '--', file])
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [hash = '', date = ''] = line.split(' ');
      return { date, body: bodyOf(git(['show', `${hash}:${file}`])) };
    });
  if (bodyOf(read(file)) !== commits[0]?.body) {
    if (inBuild) throw new Error(`${file} has uncommitted edits, so its date would be wrong`);
    return now;
  }
  // The newest commit whose body differs from the commit before it (or the first commit).
  const changed = commits.find((commit, i) => commit.body !== commits[i + 1]?.body);
  return new Date(changed!.date);
}

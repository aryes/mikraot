/**
 * "What's new": announcements of new or changed content, newest first. Each page can list updates
 * (date + one-line note, set in the editor); every post is announced on its date. The list feeds
 * the "מה חדש" page, its RSS feed and, through that feed, the newsletter.
 */

export interface UpdateSource {
  title: string;
  url: string;
  kind: 'page' | 'post';
  date: Date;
  /** For posts: what the announcement says (their excerpt). */
  summary: string;
  updates: { date: Date; note: string }[];
}

export interface Update {
  title: string;
  url: string;
  date: Date;
  note: string;
}

export function collectUpdates(sources: UpdateSource[]): Update[] {
  return sources
    .flatMap((source) => [
      ...(source.kind === 'post'
        ? [{ title: source.title, url: source.url, date: source.date, note: source.summary }]
        : []),
      ...source.updates.map((update) => ({
        title: source.title,
        url: source.url,
        date: update.date,
        note: update.note,
      })),
    ])
    .toSorted((a, b) => b.date.getTime() - a.date.getTime());
}

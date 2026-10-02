/**
 * Post archives, as on WordPress: by month (/2021/08/), category (/category/<slug>/) and author
 * (/author/<slug>/). Plain functions over post dates and slugs, so they are unit-testable.
 */

const TIME_ZONE = 'Asia/Jerusalem';

export interface ArchiveMonth {
  year: string;
  /** Two digits, as in the URL. */
  month: string;
  /** e.g. "אוגוסט 2021" */
  label: string;
  url: string;
}

/** The month a post belongs to, in Israel time (WordPress's site time zone). */
export function monthOf(date: Date): ArchiveMonth {
  const part = (type: string) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit' })
      .formatToParts(date)
      .find((p) => p.type === type)?.value ?? '';
  const year = part('year');
  const month = part('month');
  const label = date.toLocaleDateString('he-IL', {
    timeZone: TIME_ZONE,
    month: 'long',
    year: 'numeric',
  });
  return { year, month, label, url: `/${year}/${month}/` };
}

/** Distinct months of the given dates, newest first. */
export function archiveMonths(dates: Date[]): ArchiveMonth[] {
  const months = new Map<string, ArchiveMonth>();
  for (const date of dates.toSorted((a, b) => b.getTime() - a.getTime())) {
    const m = monthOf(date);
    if (!months.has(m.url)) months.set(m.url, m);
  }
  return [...months.values()];
}

export const categoryUrl = (slug: string) => `/category/${slug}/`;
export const authorUrl = (slug: string) => `/author/${slug}/`;

/** dd/mm/yyyy, as on WordPress. */
export const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { timeZone: TIME_ZONE });

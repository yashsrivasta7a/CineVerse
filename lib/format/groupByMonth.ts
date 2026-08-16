import type { Title } from '@/lib/api/tmdb/types';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export interface MonthGroup {
  key: string;
  title: string;
  items: Title[];
}

/**
 * Groups titles into chronological month buckets.
 *
 * Lifted out of the Upcoming screen so it survives that screen becoming a rail
 * on the Selection home in Phase 4, and so the generic collection screen can
 * reuse it.
 */
export function groupByMonth(
  titles: Title[],
  { futureOnly = true }: { futureOnly?: boolean } = {}
): MonthGroup[] {
  if (!titles.length) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const seen = new Set<number>();
  const valid = titles.filter((title) => {
    if (!title.date || seen.has(title.id)) return false;
    seen.add(title.id);
    if (!futureOnly) return true;
    return new Date(title.date) >= today;
  });

  valid.sort(
    (a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime()
  );

  const groups = new Map<string, Title[]>();
  for (const title of valid) {
    const date = new Date(title.date!);
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(title);
    else groups.set(key, [title]);
  }

  // Map preserves insertion order, and `valid` is already sorted.
  return Array.from(groups.entries()).map(([key, items]) => {
    const date = new Date(items[0].date!);
    return {
      key,
      title: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
      items,
    };
  });
}

/** "12 MAR" style badge text. */
export function shortDate(iso: string | null): { day: string; month: string } {
  if (!iso) return { day: '?', month: '' };
  const date = new Date(iso);
  return {
    day: String(date.getDate()),
    month: MONTH_NAMES[date.getMonth()].slice(0, 3).toUpperCase(),
  };
}

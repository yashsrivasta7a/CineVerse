/**
 * TMDB air dates, in the app's dotted broadcast format — 04.11.1994.
 *
 * Day-first, matching the ticket stubs and season listings rather than a
 * locale-derived order: the format is part of the design, and `toLocaleDateString`
 * would silently reorder it on a US device.
 */
export function airDate(iso: string | null | undefined): string | null {
  if (!iso) return null;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${day}.${month}.${date.getFullYear()}`;
}

/** `47min` / `1h 12min`, or null when TMDB has no runtime for the episode. */
export function runtimeLabel(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

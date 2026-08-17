import type { MediaType } from '@/lib/api/tmdb/types';

/**
 * Deterministic serialisation of a params object into one cache-key segment.
 *
 * This is load-bearing. Object key order is insertion order in JS, so without
 * sorting, `{ page: 1, region: 'IN' }` and `{ region: 'IN', page: 1 }` hash to
 * two different cache entries and the same request goes out twice — which the
 * Filmder deck would do on every refill.
 */
export function stable(params: Record<string, unknown>): string {
  return Object.keys(params)
    .filter(
      (key) =>
        params[key] !== undefined && params[key] !== null && params[key] !== ''
    )
    .sort()
    .map((key) => `${key}=${String(params[key])}`)
    .join('&');
}

/**
 * Coerces a TMDB id to a number before it reaches a key.
 *
 * Load-bearing. React Query hashes keys with JSON.stringify, so
 * `['tmdb','movie',5,'details']` and `['tmdb','movie','5','details']` are two
 * separate cache entries for one film. Call sites genuinely disagree about the
 * type — `DeckCard` passes `title.id` (a number) while a screen reading
 * `useLocalSearchParams` passes a string — so without this, opening a card from
 * the deck refetched a payload the deck already held, and the About sheet would
 * have opened on a spinner.
 *
 * Non-numeric input is passed through rather than becoming NaN, which would
 * collapse every bad id onto one key.
 */
function num(id: number | string): number | string {
  if (typeof id === 'number') return id;
  const parsed = Number(id);
  return Number.isFinite(parsed) && id.trim() !== '' ? parsed : id;
}

/**
 * Query key factory. Keys are hierarchical arrays so that invalidating a
 * parent invalidates everything beneath it — `invalidateQueries({ queryKey:
 * qk.tv(id) })` clears the show and all of its seasons.
 */
export const qk = {
  all: ['tmdb'] as const,

  movie: (id: number | string) => [...qk.all, 'movie', num(id)] as const,
  movieDetails: (id: number | string) => [...qk.movie(id), 'details'] as const,

  tv: (id: number | string) => [...qk.all, 'tv', num(id)] as const,
  tvDetails: (id: number | string) => [...qk.tv(id), 'details'] as const,
  season: (id: number | string, season: number) =>
    [...qk.tv(id), 'season', season] as const,
  episode: (id: number | string, season: number, episode: number) =>
    [...qk.season(id, season), 'episode', episode] as const,

  person: (id: number | string) => [...qk.all, 'person', num(id)] as const,

  discover: (kind: MediaType, params: Record<string, unknown>) =>
    [...qk.all, 'discover', kind, stable(params)] as const,

  search: (kind: string, query: string) =>
    [...qk.all, 'search', kind, query] as const,

  genres: (kind: MediaType) => [...qk.all, 'genres', kind] as const,
  genreArt: () => [...qk.all, 'genre-art'] as const,
  countries: () => [...qk.all, 'countries'] as const,

  upcoming: (maxPages: number) => [...qk.all, 'upcoming', maxPages] as const,

  /**
   * The local table is the read path, so its key carries no user id — SQLite
   * is per-install. The remote sync is keyed by user because it is per-account.
   */
  bookmarksLocal: () => ['bookmarks', 'local'] as const,
  bookmarkOne: (mediaType: string, tmdbId: number) =>
    ['bookmarks', 'local', mediaType, tmdbId] as const,
  bookmarkSync: (userId: string) => ['bookmarks', 'sync', userId] as const,

  /** Deck pages are keyed by a hash of the resolved discover params. */
  deck: (hash: string) => ['deck', hash] as const,
  prefs: () => ['prefs'] as const,
} as const;

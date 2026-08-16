import type { DiscoverParams } from '@/lib/api/tmdb/discover';
import type { PrefEntry } from '@/lib/store/prefs';
import { paramsFromMood } from './moods';

/**
 * Preferences -> TMDB /discover parameters.
 *
 * What /discover CAN express is applied server-side here. What it CANNOT is
 * listed at the bottom and has to be filtered client-side by the caller —
 * that over-fetching is structural, not an inefficiency to tune away.
 */

const byFacet = (
  entries: Record<string, PrefEntry>,
  facet: PrefEntry['facet'],
  stance: PrefEntry['stance']
) =>
  Object.values(entries)
    .filter((entry) => entry.facet === facet && entry.stance === stance)
    .map((entry) => entry.value);

export interface DeckParamsResult {
  params: DiscoverParams;
  /** Origin countries to drop after fetching — /discover has no exclusion. */
  excludeCountries: string[];
  /** Cast ids to drop after fetching — /discover has no `without_cast`. */
  blockedPeople: number[];
  /** Stable identity for the resolved params, for cache keys. */
  hash: string;
}

export function paramsFromPrefs(
  entries: Record<string, PrefEntry>,
  moodIndex?: number | null
): DeckParamsResult {
  const likedGenres = byFacet(entries, 'genre', 'like');
  const dislikedGenres = byFacet(entries, 'genre', 'dislike');
  const likedCountries = byFacet(entries, 'country', 'like');
  const dislikedCountries = byFacet(entries, 'country', 'dislike');
  const blocked = [
    ...byFacet(entries, 'person', 'dislike'),
    ...byFacet(entries, 'person', 'block'),
  ];

  // Mood sets the baseline; explicit preferences then narrow it.
  const base: DiscoverParams =
    moodIndex === undefined || moodIndex === null
      ? { sort_by: 'popularity.desc' }
      : paramsFromMood(moodIndex);

  const params: DiscoverParams = { ...base, include_adult: false };

  // Liked genres intersect with the mood's genres rather than replacing them:
  // asking for both would over-narrow, so an explicit preference wins.
  if (likedGenres.length) params.with_genres = likedGenres.join('|');

  if (dislikedGenres.length) {
    const existing = params.without_genres ? params.without_genres.split(',') : [];
    params.without_genres = Array.from(
      new Set([...existing, ...dislikedGenres])
    ).join(',');
  }

  if (likedCountries.length) {
    params.with_origin_country = likedCountries.join('|');
  }

  // Liked ACTORS are deliberately not applied here. `with_cast` narrows a deck
  // to the handful of films those specific people appear in, which empties
  // after a few swipes. They drive the "because you liked X" rails instead.

  const hash = [
    params.sort_by,
    params.with_genres,
    params.without_genres,
    params.with_origin_country,
    params['vote_average.gte'],
    params['with_runtime.lte'],
    moodIndex ?? 'none',
  ].join('|');

  return {
    params,
    excludeCountries: dislikedCountries,
    blockedPeople: blocked.map(Number).filter(Number.isFinite),
    hash,
  };
}

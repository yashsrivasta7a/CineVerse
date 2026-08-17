import type { DiscoverParams } from '@/lib/api/tmdb/discover';
import type { Title } from '@/lib/api/tmdb/types';
import type { PrefEntry } from '@/lib/store/prefs';
import { paramsFromMood } from './moods';
import { NO_LEARNED_TASTE, type LearnedTaste } from './taste';

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
  moodIndex?: number | null,
  learned: LearnedTaste = NO_LEARNED_TASTE
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

  // Nothing learned from swiping may contradict something the user stated
  // outright. An explicit like is a decision; a learned score is an inference,
  // and an inference that overrules a decision reads as the app ignoring them.
  const stated = new Set(likedGenres);
  const learnedAvoid = learned.avoidGenres.filter((genre) => !stated.has(genre));

  // Liked genres intersect with the mood's genres rather than replacing them:
  // asking for both would over-narrow, so an explicit preference wins.
  if (likedGenres.length) {
    params.with_genres = likedGenres.join('|');
  } else if (learned.boostGenres.length) {
    // Only when the user named none of their own. `with_genres` is the deck's
    // whole subject, and quietly authoring it over the top of a stated choice
    // is not learning, it is overriding.
    params.with_genres = learned.boostGenres.join('|');
  }

  const without = [...dislikedGenres, ...learnedAvoid];
  if (without.length) {
    const existing = params.without_genres ? params.without_genres.split(',') : [];
    params.without_genres = Array.from(new Set([...existing, ...without])).join(',');
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

/* ------------------------------------------------------- rails, not the deck */

/**
 * The subset of a user's taste that a *rail* can carry.
 *
 * The deck resolves to one query, so `paramsFromPrefs` can fold everything into
 * it. A page of rails cannot: each rail already has its own reason to exist, and
 * stamping the user's liked genres onto all of them would make every rail return
 * the same films under different headings. So likes are deliberately absent here
 * — they earn their own rails — and what remains is the part of a preference
 * that should hold true everywhere: the things the user does not want to see.
 */
export interface TasteFilter {
  /** Genre ids to exclude, as `/discover` wants them. */
  withoutGenres: string[];
  /** Preferred origin countries, as `/discover` wants them. */
  onlyCountries: string[];
  /** Rejected origin countries. `/discover` has no exclusion for these. */
  excludeCountries: string[];
}

export function tasteFromPrefs(entries: Record<string, PrefEntry>): TasteFilter {
  return {
    withoutGenres: byFacet(entries, 'genre', 'dislike'),
    onlyCountries: byFacet(entries, 'country', 'like'),
    excludeCountries: byFacet(entries, 'country', 'dislike'),
  };
}

/**
 * Layer a user's rejections onto one rail's own parameters.
 *
 * The country preference is skipped for cast rails. `with_cast` already narrows
 * to the handful of films one person appears in, and intersecting that with an
 * origin country routinely empties the rail — which then hides itself, so a
 * preference the user set to see *more* of what they like reads as the app
 * losing their favourite actor.
 */
export function applyTaste(params: DiscoverParams, taste: TasteFilter): DiscoverParams {
  const next: DiscoverParams = { ...params, include_adult: false };

  if (taste.withoutGenres.length) {
    const existing = next.without_genres ? next.without_genres.split(',') : [];
    next.without_genres = Array.from(
      new Set([...existing, ...taste.withoutGenres])
    ).join(',');
  }

  if (taste.onlyCountries.length && !next.with_cast && !next.with_origin_country) {
    next.with_origin_country = taste.onlyCountries.join('|');
  }

  return next;
}

/**
 * The same judgement, applied to a title that arrived from an endpoint with no
 * `/discover` parameters to filter on — trending and upcoming both return a
 * fixed global list.
 *
 * Only rejections are enforced. A country the user *likes* is a preference for
 * more of something, not a demand to be shown nothing else, and enforcing it
 * here would empty a trending rail whose entire job is to show what everyone is
 * watching.
 */
export function passesTaste(title: Title, taste: TasteFilter): boolean {
  if (taste.withoutGenres.length) {
    const rejected = new Set(taste.withoutGenres.map(Number));
    if (title.genreIds.some((id) => rejected.has(id))) return false;
  }

  if (taste.excludeCountries.length) {
    const rejected = new Set(taste.excludeCountries);
    if (title.originCountry.some((code) => rejected.has(code))) return false;
  }

  return true;
}

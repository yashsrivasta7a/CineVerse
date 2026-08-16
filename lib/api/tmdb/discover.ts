import { tmdbGet, type QueryParams } from './client';
import { normalizeMovie } from './normalize';
import type { TmdbMovieListItem, TmdbPage, Title } from './types';

/**
 * /discover parameters.
 *
 * Typed ahead of what Phase 1 uses so the Filmder deck (Phase 5) and the
 * filters modal (Phase 7) extend rather than redefine this.
 *
 * Note what /discover CANNOT express, and which the caller must therefore
 * filter client-side: an exclusion list of ids (already-swiped titles),
 * disliked origin countries, and blocked cast members. Over-fetching is
 * structural for those cases, not an inefficiency to tune away.
 */
export interface DiscoverParams extends QueryParams {
  page?: number;
  language?: string;
  sort_by?:
    | 'popularity.desc'
    | 'popularity.asc'
    | 'vote_average.desc'
    | 'vote_average.asc'
    | 'primary_release_date.desc'
    | 'primary_release_date.asc'
    | 'revenue.desc';
  include_adult?: boolean;
  /** Pipe-separated ids = OR. */
  with_genres?: string;
  /** Comma-separated ids = AND NOT. */
  without_genres?: string;
  with_origin_country?: string;
  with_original_language?: string;
  with_cast?: string;
  with_crew?: string;
  with_keywords?: string;
  'vote_average.gte'?: number;
  /**
   * Pair this with any `vote_average.gte`. Without it, a rating floor of 8
   * surfaces obscure titles holding a 10.0 off three votes.
   */
  'vote_count.gte'?: number;
  'primary_release_date.gte'?: string;
  'primary_release_date.lte'?: string;
  primary_release_year?: number;
  'with_runtime.lte'?: number;
  'with_runtime.gte'?: number;
  watch_region?: string;
  with_watch_providers?: string;
}

export function discoverMoviesPage(
  params: DiscoverParams = {},
  signal?: AbortSignal
): Promise<TmdbPage<TmdbMovieListItem>> {
  return tmdbGet<TmdbPage<TmdbMovieListItem>>(
    '/discover/movie',
    { sort_by: 'popularity.desc', page: 1, ...params },
    signal
  );
}

export async function discoverMovies(
  params: DiscoverParams = {},
  signal?: AbortSignal
): Promise<Title[]> {
  const page = await discoverMoviesPage(params, signal);
  return page.results.map(normalizeMovie);
}

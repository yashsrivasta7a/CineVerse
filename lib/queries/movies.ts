import { useQuery } from '@tanstack/react-query';

import { getMovieDetails, getUpcomingMovieItems } from '@/lib/api/tmdb/movies';
import { discoverMoviesPage, type DiscoverParams } from '@/lib/api/tmdb/discover';
import { searchMoviesPage } from '@/lib/api/tmdb/search';
import { normalizeMovie } from '@/lib/api/tmdb/normalize';
import { qk } from './keys';

/**
 * All list hooks return the normalized `Title` shape. Components never see a
 * raw TMDB payload, which is what keeps `title ?? name` branches from spreading
 * once TV lands.
 */

export function useMovieDetails(movieId: string | number | undefined) {
  return useQuery({
    queryKey: qk.movieDetails(movieId ?? ''),
    queryFn: ({ signal }) => getMovieDetails(movieId!, signal),
    enabled: movieId !== undefined && movieId !== '',
  });
}

export function usePopularMovies(params: DiscoverParams = {}) {
  return useQuery({
    queryKey: qk.discover('movie', params),
    queryFn: ({ signal }) => discoverMoviesPage(params, signal),
    select: (page) => page.results.map(normalizeMovie),
  });
}

export function useUpcomingMovies(maxPages = 3) {
  return useQuery({
    queryKey: qk.upcoming(maxPages),
    queryFn: ({ signal }) => getUpcomingMovieItems(maxPages, signal),
    select: (items) => items.map(normalizeMovie),
  });
}

/**
 * `query` should already be debounced — see `useDebouncedValue`. An empty
 * query disables the request rather than firing a wildcard search.
 */
export function useMovieSearch(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: qk.search('movie', trimmed),
    queryFn: ({ signal }) => searchMoviesPage(trimmed, 1, signal),
    select: (page) => page.results.map(normalizeMovie),
    enabled: trimmed.length > 0,
    staleTime: 60_000,
  });
}

import { tmdbGet } from './client';
import { normalizeMovie } from './normalize';
import type { TmdbMovieListItem, TmdbPage, Title } from './types';

export function searchMoviesPage(
  query: string,
  page = 1,
  signal?: AbortSignal
): Promise<TmdbPage<TmdbMovieListItem>> {
  return tmdbGet<TmdbPage<TmdbMovieListItem>>(
    '/search/movie',
    { query, page, include_adult: false, language: 'en-US' },
    signal
  );
}

export async function searchMovies(
  query: string,
  page = 1,
  signal?: AbortSignal
): Promise<Title[]> {
  const results = await searchMoviesPage(query, page, signal);
  return results.results.map(normalizeMovie);
}

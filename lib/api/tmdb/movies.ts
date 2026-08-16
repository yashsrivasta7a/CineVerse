import { tmdbGet } from './client';
import { normalizeMovie } from './normalize';
import type { TmdbMovieDetails, TmdbMovieListItem, TmdbPage, Title } from './types';

/**
 * Everything the detail screen needs, in ONE request.
 *
 * `append_to_response` folds credits, videos, reviews, recommendations and
 * watch providers into the same call — five round-trips collapsed into one,
 * and it is what replaced the separate Watchmode integration.
 */
const MOVIE_APPEND = [
  'credits',
  'videos',
  'reviews',
  'recommendations',
  'release_dates',
  'watch/providers',
].join(',');

export function getMovieDetails(
  movieId: string | number,
  signal?: AbortSignal
): Promise<TmdbMovieDetails> {
  return tmdbGet<TmdbMovieDetails>(
    `/movie/${movieId}`,
    { append_to_response: MOVIE_APPEND, language: 'en-US' },
    signal
  );
}

export function getUpcomingMoviesPage(
  page = 1,
  signal?: AbortSignal
): Promise<TmdbPage<TmdbMovieListItem>> {
  return tmdbGet<TmdbPage<TmdbMovieListItem>>(
    '/movie/upcoming',
    { language: 'en-US', page },
    signal
  );
}

/**
 * Upcoming releases across several pages.
 *
 * Page 1 is fetched first because its `total_pages` bounds the rest; the
 * remainder then go out in parallel instead of the previous sequential loop,
 * which serialised three round-trips for no reason.
 */
export async function getUpcomingMovieItems(
  maxPages = 3,
  signal?: AbortSignal
): Promise<TmdbMovieListItem[]> {
  const first = await getUpcomingMoviesPage(1, signal);
  const lastPage = Math.min(maxPages, first.total_pages);

  if (lastPage <= 1) return first.results;

  const rest = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, index) =>
      getUpcomingMoviesPage(index + 2, signal)
    )
  );

  return [first, ...rest].flatMap((page) => page.results);
}

export async function getUpcomingMovies(
  maxPages = 3,
  signal?: AbortSignal
): Promise<Title[]> {
  const items = await getUpcomingMovieItems(maxPages, signal);
  return items.map(normalizeMovie);
}

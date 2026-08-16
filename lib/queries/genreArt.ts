import { useQuery } from '@tanstack/react-query';

import { discoverMoviesPage } from '@/lib/api/tmdb/discover';
import { qk } from './keys';

/**
 * A representative poster for each genre.
 *
 * TMDB has no "artwork for a genre" endpoint, and the obvious approach — one
 * `/discover` call per genre — costs ~19 requests on a first-run screen.
 *
 * Every list item already carries its own `genre_ids`, so two pages of popular
 * films (40 titles) are enough to cover the common genres in **two** requests.
 * Each genre takes the poster of the most popular film carrying it, which is
 * also a better pick than an arbitrary high-vote-count result.
 *
 * Cached forever — the mapping only needs to be stable, not fresh.
 */
export function useGenreArt() {
  return useQuery({
    queryKey: qk.genreArt(),
    queryFn: async ({ signal }) => {
      const [first, second] = await Promise.all([
        discoverMoviesPage({ sort_by: 'popularity.desc', page: 1 }, signal),
        discoverMoviesPage({ sort_by: 'popularity.desc', page: 2 }, signal),
      ]);

      const art: Record<string, string> = {};

      for (const movie of [...first.results, ...second.results]) {
        if (!movie.poster_path) continue;
        for (const genreId of movie.genre_ids) {
          // First writer wins, and results arrive in popularity order.
          if (!art[String(genreId)]) art[String(genreId)] = movie.poster_path;
        }
      }

      return art;
    },
    staleTime: Infinity,
  });
}

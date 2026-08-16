import { useQuery } from '@tanstack/react-query';

import { getTrending } from '@/lib/api/tmdb/trending';
import { qk } from './keys';

/**
 * What is trending, from TMDB.
 *
 * This replaced the app's own Appwrite search counters, which returned at most
 * four rows and were completely empty on a fresh install — a new user's home
 * screen had no trending rail at all. It also means search no longer has to
 * write to a database on every keystroke-settled query.
 */
export function useTrendingMovies() {
  return useQuery({
    queryKey: qk.trending(),
    queryFn: ({ signal }) => getTrending('day', signal),
    staleTime: 1000 * 60 * 30,
  });
}

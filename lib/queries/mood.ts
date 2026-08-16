import { useQueries, useQuery } from '@tanstack/react-query';

import { discoverMoviesPage } from '@/lib/api/tmdb/discover';
import { normalizeMovie } from '@/lib/api/tmdb/normalize';
import { MOOD_PROFILES, paramsFromMood } from '@/lib/recommend/moods';
import { qk } from './keys';

/**
 * One representative poster per mood, for the image-mode picker.
 *
 * Five small requests, each the *actual* top result for that mood — so the tile
 * you tap is a genuine sample of what choosing it will serve you, not a
 * decorative stand-in.
 *
 * Cached indefinitely: the mapping only has to be stable, not fresh.
 */
export function useMoodPreview() {
  const results = useQueries({
    queries: MOOD_PROFILES.map((_, index) => ({
      queryKey: [...qk.all, 'mood-preview', index] as const,
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        discoverMoviesPage({ ...paramsFromMood(index), page: 1 }, signal),
      staleTime: Infinity,
      select: (page: Awaited<ReturnType<typeof discoverMoviesPage>>) =>
        page.results
          .map((movie) => movie.poster_path)
          .filter((path): path is string => !!path)
          .slice(0, 3),
    })),
  });

  const data = results.every((result) => result.data !== undefined)
    ? results.map((result) => result.data as string[])
    : undefined;

  return { data, isPending: results.some((result) => result.isPending) };
}

/** The titles a given mood actually surfaces — used by the result rail. */
export function useMoodResults(moodIndex: number | null) {
  return useQuery({
    queryKey: qk.discover('movie', {
      ...(moodIndex === null ? {} : paramsFromMood(moodIndex)),
      mood: moodIndex ?? 'none',
    }),
    queryFn: ({ signal }) =>
      discoverMoviesPage(moodIndex === null ? {} : paramsFromMood(moodIndex), signal),
    select: (page) => page.results.map(normalizeMovie),
    enabled: moodIndex !== null,
  });
}

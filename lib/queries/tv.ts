import { useQueries, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { getEpisode, getSeason, getTvDetails } from '@/lib/api/tmdb/tv';
import {
  getInProgressShows,
  getWatchedEpisodes,
  markEpisodeWatched,
  unmarkEpisodeWatched,
} from '@/db/queries/watched';
import { qk } from './keys';

export function useTvDetails(tvId: string | number | undefined) {
  return useQuery({
    queryKey: qk.tvDetails(tvId ?? ''),
    queryFn: ({ signal }) => getTvDetails(tvId!, signal),
    enabled: tvId !== undefined && tvId !== '',
  });
}

export function useSeason(tvId: string | number | undefined, season: number) {
  return useQuery({
    queryKey: qk.season(tvId ?? '', season),
    queryFn: ({ signal }) => getSeason(tvId!, season, signal),
    enabled: tvId !== undefined && tvId !== '',
  });
}

/**
 * One episode.
 *
 * Longer `staleTime` than the show around it: an aired episode's title, still
 * and guest list do not change, and the reel scrubber pushes between siblings
 * fast enough that a refetch per hop would be visible.
 */
export function useEpisode(
  tvId: string | number | undefined,
  season: number,
  episode: number
) {
  return useQuery({
    queryKey: qk.episode(tvId ?? '', season, episode),
    queryFn: ({ signal }) => getEpisode(tvId!, season, episode, signal),
    enabled:
      tvId !== undefined &&
      tvId !== '' &&
      Number.isFinite(season) &&
      Number.isFinite(episode),
    staleTime: 1000 * 60 * 60 * 12,
  });
}

/**
 * Watched state for one show, held in memory and mirrored to SQLite.
 *
 * The toggle writes synchronously so the checkmark never lags behind the tap,
 * and the set is re-derived locally rather than re-read, which keeps a long
 * season list responsive.
 */
export function useWatchedEpisodes(tvId: number | undefined) {
  const [watched, setWatched] = useState<ReadonlySet<string>>(() => {
    if (tvId === undefined) return new Set();
    return new Set(
      getWatchedEpisodes(tvId).map((row) => `${row.season}:${row.episode}`)
    );
  });

  const isWatched = useCallback(
    (season: number, episode: number) => watched.has(`${season}:${episode}`),
    [watched]
  );

  const toggle = useCallback(
    (season: number, episode: number) => {
      if (tvId === undefined) return;
      const key = `${season}:${episode}`;

      setWatched((previous) => {
        const next = new Set(previous);
        if (next.has(key)) {
          next.delete(key);
          unmarkEpisodeWatched(tvId, season, episode);
        } else {
          next.add(key);
          markEpisodeWatched(tvId, season, episode);
        }
        return next;
      });
    },
    [tvId]
  );

  return { isWatched, toggle, watchedCount: watched.size };
}

/**
 * Shows the user has started, with real progress.
 *
 * Each show's total episode count comes from its own (cached) detail record —
 * so the bar is `watched / total`, both of which are facts.
 */
export function useContinueWatching(limit = 10) {
  const inProgress = useMemo(() => getInProgressShows(limit), [limit]);

  const details = useQueries({
    queries: inProgress.map((show) => ({
      queryKey: qk.tvDetails(show.tvId),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getTvDetails(show.tvId, signal),
      staleTime: 1000 * 60 * 60 * 12,
    })),
  });

  return useMemo(
    () =>
      inProgress
        .map((show, index) => {
          const detail = details[index]?.data;
          if (!detail) return null;

          const total = detail.number_of_episodes || 0;
          return {
            tvId: show.tvId,
            name: detail.name,
            posterPath: detail.poster_path,
            backdropPath: detail.backdrop_path,
            watched: show.watched,
            total,
            progress: total > 0 ? Math.min(1, show.watched / total) : 0,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [inProgress, details]
  );
}

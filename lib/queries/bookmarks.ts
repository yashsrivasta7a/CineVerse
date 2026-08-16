import { useCallback, useMemo } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  addBookmarkLocal,
  clearFlicksBookmarks,
  isBookmarked,
  listBookmarks,
  markBookmarkSynced,
  pendingBookmarks,
  reconcileBookmarks,
  removeBookmarkLocal,
} from '@/db/queries/bookmarks';
import {
  addBookmark,
  getBookmarks,
  removeBookmark,
} from '@/lib/api/appwrite/bookmarks';
import { getMovieDetails } from '@/lib/api/tmdb/movies';
import type { MediaType, TmdbMovieDetails } from '@/lib/api/tmdb/types';
import { qk } from './keys';

/**
 * The library.
 *
 * SQLite is the read path and Appwrite is the mirror. Reading the id list
 * straight from Appwrite — which this did until now — meant the Vault was
 * empty whenever the backend was unreachable: airplane mode, a cold start
 * before the network settles, or a project paused for inactivity. None of
 * those are states in which a user's own saved list should vanish.
 *
 * The titles themselves still come from TMDB, one cache entry each, so a
 * single failing record cannot blank the screen.
 */

/**
 * Pushes queued additions and removals, then folds the server's view back in.
 *
 * Best-effort throughout: a row that fails to push keeps `synced = 0` and is
 * retried next time. Only a *successful* listing is allowed to reconcile,
 * because reconciliation deletes local rows the server does not have.
 */
async function syncBookmarks(userId: string): Promise<void> {
  for (const row of pendingBookmarks()) {
    const ok = row.deleted
      ? await removeBookmark(userId, row.tmdb_id)
      : await addBookmark(userId, {
          id: row.tmdb_id,
          title: row.title ?? '',
        });

    if (ok) markBookmarkSynced(row.media_type, row.tmdb_id);
  }

  // Throws if unreachable, which is the point — see getBookmarks.
  const remote = await getBookmarks(userId);

  reconcileBookmarks(
    remote
      .map((doc) => {
        const record = doc as {
          movieId?: number | string;
          title?: string;
          createdDate?: string;
        };
        return {
          mediaType: 'movie' as MediaType,
          tmdbId: Number(record.movieId),
          createdAt: record.createdDate
            ? Date.parse(record.createdDate)
            : Date.now(),
          title: record.title ?? null,
        };
      })
      .filter((item) => Number.isFinite(item.tmdbId))
  );
}

/** The local list. Invalidate `qk.bookmarksLocal()` after any write. */
export function useBookmarkIds() {
  return useQuery({
    queryKey: qk.bookmarksLocal(),
    queryFn: () => listBookmarks(),
    // The source is a synchronous local table; it only changes when this app
    // writes to it, and those paths invalidate explicitly.
    staleTime: Infinity,
  });
}

export function useBookmarkedMovies(userId: string | undefined) {
  const queryClient = useQueryClient();
  const local = useBookmarkIds();

  /**
   * Runs alongside the local read rather than gating it. Its failure is
   * expected and non-fatal — the Vault renders from SQLite either way — so it
   * does not retry hard against a backend that is down.
   */
  const sync = useQuery({
    queryKey: qk.bookmarkSync(userId ?? ''),
    queryFn: async () => {
      await syncBookmarks(userId!);
      await queryClient.invalidateQueries({ queryKey: qk.bookmarksLocal() });
      return Date.now();
    },
    enabled: !!userId,
    retry: 1,
    staleTime: 1000 * 60,
  });

  const movieRows = useMemo(
    () => (local.data ?? []).filter((row) => row.media_type === 'movie'),
    [local.data]
  );

  const movieIds = useMemo(
    () => movieRows.map((row) => row.tmdb_id),
    [movieRows]
  );

  /**
   * Ids the deck saved automatically.
   *
   * Rows written before the `source` column existed read as `manual`, which is
   * the right default — they predate auto-saving, so a user who saved them did
   * so deliberately.
   */
  const flicksIds = useMemo(
    () =>
      new Set(
        movieRows
          .filter((row) => row.source === 'flicks')
          .map((row) => row.tmdb_id)
      ),
    [movieRows]
  );

  const detailQueries = useQueries({
    queries: movieIds.map((id) => ({
      queryKey: qk.movieDetails(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        getMovieDetails(id, signal),
      staleTime: 1000 * 60 * 60,
    })),
  });

  const movies = useMemo(
    () =>
      detailQueries
        .map((query) => query.data)
        .filter((movie): movie is TmdbMovieDetails => movie !== undefined),
    [detailQueries]
  );

  const refetch = useCallback(() => {
    void local.refetch();
    void sync.refetch();
  }, [local, sync]);

  const clearFromFlicks = useCallback(() => {
    clearFlicksBookmarks();
    void queryClient.invalidateQueries({ queryKey: qk.bookmarksLocal() });
  }, [queryClient]);

  return {
    movies,
    /** Which of `movies` arrived from a right-swipe rather than a deliberate save. */
    flicksIds,
    /** Tombstones every deck-saved bookmark, leaving hand-picked ones alone. */
    clearFromFlicks,
    isPending:
      local.isPending ||
      (movieIds.length > 0 && detailQueries.some((query) => query.isPending)),
    /**
     * Only TMDB failures are errors here. A dead Appwrite is reported through
     * `syncError` instead, so the screen can show its list with a quiet notice
     * rather than an empty error state.
     */
    error: detailQueries.find((q) => q.error)?.error ?? null,
    syncError: sync.error ?? null,
    refetch,
    /** Count of bookmarks whose TMDB record could not be loaded. */
    failedCount: detailQueries.filter((query) => query.isError).length,
  };
}

/**
 * Toggle for a detail screen. Writes to SQLite synchronously so the star
 * responds immediately and stays correct with no network, then lets the next
 * sync carry it upstream.
 */
export function useBookmarkToggle(
  mediaType: MediaType,
  tmdbId: number | undefined,
  title: string | undefined
) {
  const queryClient = useQueryClient();

  const bookmarked = useQuery({
    queryKey: qk.bookmarkOne(mediaType, tmdbId ?? 0),
    queryFn: () => isBookmarked(mediaType, tmdbId!),
    enabled: !!tmdbId,
    staleTime: Infinity,
  });

  const toggle = useCallback(() => {
    if (!tmdbId) return;

    if (bookmarked.data) {
      removeBookmarkLocal(mediaType, tmdbId);
    } else {
      addBookmarkLocal(mediaType, tmdbId, title ?? '');
    }

    // bookmarkOne nests under bookmarksLocal, so this one prefix invalidation
    // refreshes the list and every individual star in the app.
    void queryClient.invalidateQueries({ queryKey: qk.bookmarksLocal() });
  }, [bookmarked.data, mediaType, tmdbId, title, queryClient]);

  return { isBookmarked: !!bookmarked.data, toggle };
}

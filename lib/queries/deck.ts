import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { discoverMoviesPage } from '@/lib/api/tmdb/discover';
import { normalizeMovie } from '@/lib/api/tmdb/normalize';
import type { Title } from '@/lib/api/tmdb/types';
import { paramsFromPrefs } from '@/lib/recommend/params';
import { usePrefs } from '@/lib/store/prefs';
import { getVerdictIds, recordVerdict, type Verdict } from '@/db/queries/verdicts';
import { qk } from './keys';

/** Refill when fewer than this many unjudged cards remain. */
const REFILL_THRESHOLD = 8;

export interface DeckController {
  cards: Title[];
  isLoading: boolean;
  isError: boolean;
  /** True while more pages are being pulled in behind the deck. */
  isRefilling: boolean;
  /** No more results anywhere — the preference set is exhausted. */
  isExhausted: boolean;
  commit: (title: Title, verdict: Verdict, reaction?: string) => void;
  blockedPeople: number[];
  excludeCountries: string[];
}

/**
 * The Filmder deck.
 *
 * Over-fetching here is structural, not a bug to optimise away: /discover
 * cannot express "exclude these 400 ids", so a page of 20 can yield only a
 * handful of survivors once already-judged titles are removed. The refill
 * threshold compensates by pulling the next page well before the deck empties.
 *
 * The exclusion set comes from SQLite as an id list, hydrated once, then kept
 * current in memory — so a swiped title cannot reappear in this session or any
 * future one.
 */
export function useDeck(moodIndex?: number | null): DeckController {
  const entries = usePrefs((state) => state.entries);

  const resolved = useMemo(
    () => paramsFromPrefs(entries, moodIndex),
    [entries, moodIndex]
  );

  // Lazy initialiser: the SQL read runs once per mount, not on every render.
  const [judged, setJudged] = useState<ReadonlySet<number>>(
    () => new Set(getVerdictIds('movie'))
  );

  const query = useInfiniteQuery({
    queryKey: qk.deck(resolved.hash),
    queryFn: ({ pageParam, signal }) =>
      discoverMoviesPage({ ...resolved.params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.total_pages ? last.page + 1 : undefined,
    staleTime: 1000 * 60 * 30,
  });

  const cards = useMemo(() => {
    const seen = new Set<number>();
    const out: Title[] = [];

    for (const page of query.data?.pages ?? []) {
      for (const raw of page.results) {
        if (judged.has(raw.id) || seen.has(raw.id)) continue;
        seen.add(raw.id);
        out.push(normalizeMovie(raw));
      }
    }

    return out;
  }, [query.data, judged]);

  // Pull the next page while the user is still working through this one.
  const needsRefill =
    cards.length < REFILL_THRESHOLD &&
    query.hasNextPage &&
    !query.isFetchingNextPage;

  if (needsRefill) {
    // Safe during render: TanStack Query dedupes concurrent calls for the same
    // page, and this does not touch React state synchronously.
    void query.fetchNextPage();
  }

  const commit = useCallback(
    (title: Title, verdict: Verdict, reaction?: string) => {
      // Written synchronously — the deck must never await the network.
      recordVerdict('movie', title.id, verdict, reaction);
      setJudged((previous) => {
        const next = new Set(previous);
        next.add(title.id);
        return next;
      });
    },
    []
  );

  return {
    cards,
    isLoading: query.isPending,
    isError: query.isError,
    isRefilling: query.isFetchingNextPage,
    isExhausted: !query.hasNextPage && cards.length === 0 && !query.isPending,
    commit,
    blockedPeople: resolved.blockedPeople,
    excludeCountries: resolved.excludeCountries,
  };
}

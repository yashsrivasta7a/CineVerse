import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { addBookmarkLocal } from '@/db/queries/bookmarks';
import {
  getTasteSignals,
  getVerdictIds,
  recordVerdict,
  type Verdict,
} from '@/db/queries/verdicts';
import { discoverMoviesPage, type DiscoverParams } from '@/lib/api/tmdb/discover';
import { normalizeMovie } from '@/lib/api/tmdb/normalize';
import type { Title } from '@/lib/api/tmdb/types';
import { paramsFromPrefs } from '@/lib/recommend/params';
import { interleave, mergePool, rankPool, wildcardParams } from '@/lib/recommend/pool';
import { buildVector, learnedTaste, updateVector } from '@/lib/recommend/taste';
import { usePrefs } from '@/lib/store/prefs';
import { qk } from './keys';

/** Refill the ranked pool when fewer than this many candidates remain. */
const REFILL_BELOW = 15;

/** Keep at least this many wildcards on hand (1 in 4 cards shown is one). */
const WILD_BELOW = 5;

/** One of the deck's four outcomes. */
export interface DeckVerdict {
  verdict: Verdict;
  /** The user marked the title as one they had already watched. */
  seen: boolean;
  reaction?: string;
}

export interface DeckController {
  cards: Title[];
  /** Ids currently served from the exploration probe — the UI marks them. */
  wildIds: ReadonlySet<number>;
  isLoading: boolean;
  isError: boolean;
  /**
   * Held no cards, but more are on the way. Distinct from `isExhausted`: one is
   * "wait", the other is "there is nothing left", and showing the second when
   * the first is true tells people they have finished a deck they have barely
   * started.
   */
  isRefilling: boolean;
  /** No more results anywhere — the preference set is exhausted. */
  isExhausted: boolean;
  /** Re-runs the failed load. The error state must never be terminal. */
  retry: () => void;
  commit: (title: Title, outcome: DeckVerdict) => void;
}

/**
 * The adaptive deck.
 *
 * Two probes drain into one client-side pool:
 *
 *   main probe  — stated prefs + mood + learned genres, popularity order
 *   wildcard    — acclaimed titles OUTSIDE the learned genres (exploration)
 *
 * The taste vector updates on EVERY swipe and the pool re-ranks immediately —
 * only the top two cards are locked so nothing moves under the thumb. Fetching
 * is demand-paged: one page of 20 when survivors drop below the threshold, and
 * that page's query is rebuilt from the *current* vector, so every refill is
 * also a retune. No drift metric, no timer.
 *
 * Over-fetching is structural: /discover cannot express "exclude these ids",
 * so judged titles are filtered client-side from every page.
 *
 * ponytail: no rate limiter in front of these fetches. Steady state is one
 * metadata page per ~15 swipes — nowhere near TMDB's 40 req/s. Ceiling: many
 * parallel probes; upgrade path: token bucket around tmdbFetch (system_design.md).
 */
export function useDeck(moodIndex?: number | null): DeckController {
  const entries = usePrefs((state) => state.entries);
  const queryClient = useQueryClient();

  // Session-lived, mutated in place. The pool arrays are the render state;
  // the vector only needs to be current when a rank or refill reads it.
  const [vector] = useState(() => buildVector(getTasteSignals('movie')));

  /**
   * Every id already spoken for: swiped in any past session, or currently held
   * by either lane.
   *
   * One shared mutable set rather than reading the lane arrays, because a
   * callback that closed over `main`/`wild` would both go stale and re-create
   * itself on every pool change — which is exactly the dependency that would
   * make the refill effect fire in a loop.
   */
  const [taken] = useState(() => new Set<number>(getVerdictIds('movie')));

  const [main, setMain] = useState<Title[]>([]);
  const [wild, setWild] = useState<Title[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  /**
   * Cards handed out since this deck was built. Drives the exploration slot
   * count in `interleave`, which has to be global — a per-render index makes the
   * wildcard walk down the list exactly as fast as the user walks up it.
   */
  const [dealt, setDealt] = useState(0);

  /** Bumped by `retry()` to re-run the identity effect after a failed load. */
  const [attempt, setAttempt] = useState(0);

  // Paging cursors. In state rather than a ref only because exhaustion must
  // re-render; the page numbers ride along.
  const [cursor, setCursor] = useState({ main: 1, wild: 1, mainDone: false, wildDone: false });

  /**
   * Identity of the deck: stated prefs + mood. The vector is deliberately NOT
   * part of this — vector movement retunes the next page, it must never reset
   * the session. Changing mood or preferences rebuilds the deck from scratch.
   */
  const baseHash = useMemo(
    () => paramsFromPrefs(entries, moodIndex).hash,
    [entries, moodIndex]
  );

  const fetchPage = useCallback(
    (params: DiscoverParams, page: number) => {
      const paged = { ...params, page };
      return queryClient.fetchQuery({
        queryKey: qk.discover('movie', paged),
        queryFn: ({ signal }) => discoverMoviesPage(paged, signal),
        staleTime: 1000 * 60 * 30,
      });
    },
    [queryClient]
  );

  /**
   * One refill step for whichever pool is short. Serialised by `status` checks
   * being re-run per render; duplicate in-flight fetches collapse in
   * fetchQuery's dedupe anyway, so a stray double call costs nothing.
   */
  const refill = useCallback(
    async (lane: 'main' | 'wild', page: number) => {
      const params =
        lane === 'main'
          ? paramsFromPrefs(entries, moodIndex, learnedTaste(vector)).params
          : wildcardParams(vector);

      const result = await fetchPage(params, page);
      const titles = result.results.map(normalizeMovie);

      // Empty page = this probe shape is spent. A later retune could in theory
      // reopen it; treating done as final is the simpler behaviour and the
      // exhausted screen offers the way out (widen preferences).
      const done = titles.length === 0 || result.page >= result.total_pages;

      setCursor((prev) =>
        lane === 'main'
          ? { ...prev, main: page + 1, mainDone: done }
          : { ...prev, wild: page + 1, wildDone: done }
      );

      if (lane === 'main') {
        setMain((prev) => rankPool(mergePool(prev, titles, taken), vector));
      } else {
        setWild((prev) => mergePool(prev, titles, taken).slice(0, 20));
      }
    },
    [entries, moodIndex, vector, taken, fetchPage]
  );

  // Deck identity changed (first mount, mood change, prefs change): reset and
  // load page 1 of both probes.
  useEffect(() => {
    let cancelled = false;

    setMain([]);
    setWild([]);
    // The lanes are being emptied, so every id they were holding is free again.
    // Judged ids are re-seeded rather than kept, so a stale claim from the
    // previous deck shape cannot suppress a title the new one should offer.
    taken.clear();
    for (const id of getVerdictIds('movie')) taken.add(id);
    setCursor({ main: 1, wild: 1, mainDone: false, wildDone: false });
    setDealt(0);
    setStatus('loading');

    // The wildcard lane is allowed to fail on its own — it is the exploration
    // extra, and losing it must not cost the user a deck the main probe filled.
    Promise.all([refill('main', 1), refill('wild', 1).catch(() => {})])
      .then(() => !cancelled && setStatus('ready'))
      .catch(() => !cancelled && setStatus('error'));

    return () => {
      cancelled = true;
    };
    // refill is deliberately absent: it changes identity when the vector
    // object's deps shift, and this effect must run only on deck identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseHash, attempt]);

  // Demand paging: top up whichever lane is short. Refill failures are
  // swallowed — the deck keeps serving what it holds, and the next swipe
  // retriggers this effect for another attempt.
  useEffect(() => {
    if (status !== 'ready') return;
    if (main.length < REFILL_BELOW && !cursor.mainDone) {
      refill('main', cursor.main).catch(() => {});
    }
    if (wild.length < WILD_BELOW && !cursor.wildDone) {
      refill('wild', cursor.wild).catch(() => {});
    }
  }, [status, main.length, wild.length, cursor, refill]);

  const commit = useCallback(
    (title: Title, outcome: DeckVerdict) => {
      // Written synchronously — the deck must never await the network. The
      // snapshot fields ride along so the vector can be rebuilt from history.
      recordVerdict('movie', title.id, outcome.verdict, {
        seen: outcome.seen,
        genreIds: title.genreIds,
        reaction: outcome.reaction,
        date: title.date,
        originalLanguage: title.originalLanguage,
        popularity: title.popularity,
        voteAverage: title.voteAverage,
      });

      // Interested — and only interested — saves. "Watched and liked" is a
      // taste signal about a film the user has already seen; filing it in the
      // Vault would be telling them to go and watch it again.
      if (outcome.verdict === 'up' && !outcome.seen) {
        addBookmarkLocal('movie', title.id, title.title, 'flicks');
        void queryClient.invalidateQueries({ queryKey: qk.bookmarksLocal() });
      }

      // Stays claimed: it must never be refetched into either lane again.
      taken.add(title.id);
      setDealt((count) => count + 1);

      // The adaptive step: absorb the verdict, then re-rank everything behind
      // the locked top of the deck. This is why swipe #1 shows by card #3.
      updateVector(vector, title, outcome.verdict, outcome.seen);
      setMain((prev) => rankPool(prev.filter((t) => t.id !== title.id), vector));
      setWild((prev) => prev.filter((t) => t.id !== title.id));
    },
    [queryClient, vector, taken]
  );

  const cards = useMemo(() => interleave(main, wild, dealt), [main, wild, dealt]);
  const wildIds = useMemo(() => new Set(wild.map((t) => t.id)), [wild]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const empty = status === 'ready' && cards.length === 0;

  return {
    cards,
    wildIds,
    isLoading: status === 'loading',
    isError: status === 'error',
    // Out of cards but a probe still has pages left: the next page is already
    // in flight from the demand-paging effect, so this is "wait", not "done".
    isRefilling: empty && !(cursor.mainDone && cursor.wildDone),
    isExhausted: empty && cursor.mainDone && cursor.wildDone,
    retry,
    commit,
  };
}

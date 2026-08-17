import type { DiscoverParams } from '@/lib/api/tmdb/discover';
import type { Title } from '@/lib/api/tmdb/types';
import { scoreTitle, topGenres, type TasteVector } from './taste';

/**
 * Candidate pool helpers for the adaptive deck. All pure — the deck hook owns
 * the state, these own the rules.
 */

/** Every Nth card shown is a wildcard rather than the top-ranked candidate. */
export const WILD_EVERY = 4;

/** Hard bound on candidates held in memory (~1 KB each — metadata only). */
export const POOL_CAP = 60;

/**
 * The top of the deck that re-ranking must never touch: the card under the
 * user's thumb and the one visible behind it. Everything deeper re-sorts on
 * every swipe — which is what makes swipe #1 visible by card #3.
 */
export const LOCKED = 2;

/**
 * New page merged into a lane, appended in arrival order.
 *
 * `taken` is every id already spoken for — judged, or sitting in EITHER lane —
 * and is mutated here as ids are claimed. One shared set rather than a per-lane
 * check because the two probes overlap heavily before any taste is learned
 * (with no learned genres the wildcard query is just "acclaimed", which is most
 * of "popular"), and a title sitting in both lanes gets dealt twice by
 * `interleave`. It also dedupes within the incoming page itself.
 */
export function mergePool(
  pool: Title[],
  incoming: Title[],
  taken: Set<number>
): Title[] {
  const fresh: Title[] = [];
  for (const title of incoming) {
    if (taken.has(title.id)) continue;
    taken.add(title.id);
    fresh.push(title);
  }
  return fresh.length ? [...pool, ...fresh] : pool;
}

/**
 * Re-rank: first `LOCKED` cards stay exactly where they are, the rest sort by
 * score. Ties keep fetch order (JS sort is stable), so an empty vector leaves
 * the pool in TMDB popularity order — cold start needs no special case.
 */
export function rankPool(pool: Title[], vector: TasteVector): Title[] {
  const locked = pool.slice(0, LOCKED);
  const rest = pool
    .slice(LOCKED)
    .map((title) => ({ title, score: scoreTitle(title, vector) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.title);
  return [...locked, ...rest].slice(0, POOL_CAP);
}

/**
 * Every WILD_EVERY-th card DEALT comes from the wildcard lane instead of the
 * ranked one — epsilon-greedy exploration (epsilon = 1/WILD_EVERY). Without it
 * the deck converges on the user's top genre cluster by ~20 swipes and nothing
 * outside it is ever sampled again.
 *
 * `dealt` — how many cards this deck has already handed out — is what makes the
 * slot count global rather than per-render, and it is load-bearing.
 *
 * Positioning off `out.length` alone put a wildcard at index 3 of every list.
 * Each swipe removes one card from the ranked lane and re-runs this, which
 * simply rebuilt the list with a wildcard at index 3 again — so the wildcard
 * walked down as fast as the user walked up and never once reached the top of
 * the deck. The whole exploration lane was unreachable while looking, in the
 * returned array, exactly as though it worked.
 */
export function interleave(ranked: Title[], wild: Title[], dealt = 0): Title[] {
  const out: Title[] = [];
  let r = 0;
  let w = 0;
  while (r < ranked.length || w < wild.length) {
    const wantWild = (dealt + out.length + 1) % WILD_EVERY === 0;
    if (wantWild && w < wild.length) out.push(wild[w++]);
    else if (r < ranked.length) out.push(ranked[r++]);
    else if (w < wild.length) out.push(wild[w++]);
    else break;
  }
  return out;
}

/**
 * The probe aimed AWAY from the vector: acclaimed titles outside the user's
 * top genres. One deliberate rule, not a tuned system — its job is to keep the
 * exploration lane stocked with things ranking would never surface.
 */
export function wildcardParams(vector: TasteVector): DiscoverParams {
  const params: DiscoverParams = {
    sort_by: 'vote_average.desc',
    'vote_count.gte': 500,
    include_adult: false,
  };
  const avoid = topGenres(vector, 2);
  if (avoid.length) params.without_genres = avoid.join(',');
  return params;
}

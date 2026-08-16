import { tmdbGet, type QueryParams } from './client';
import { normalizeTv } from './normalize';
import type {
  TmdbPage,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbTvListItem,
  Title,
} from './types';

/**
 * TV endpoints.
 *
 * Two things differ from the movie side and are easy to get wrong:
 * - Credits come from `aggregate_credits`, not `credits`, because a performer
 *   can hold several roles across a run.
 * - The genre vocabulary is NOT the movie one. TV has 10759 Action&Adventure
 *   and 10765 Sci-Fi&Fantasy, and none of 28/12/878. Never pass a movie genre
 *   id to a TV endpoint.
 */

const TV_APPEND = [
  'aggregate_credits',
  'videos',
  'reviews',
  'recommendations',
  'content_ratings',
  'watch/providers',
].join(',');

export function getTvDetails(
  tvId: string | number,
  signal?: AbortSignal
): Promise<TmdbTvDetails> {
  return tmdbGet<TmdbTvDetails>(
    `/tv/${tvId}`,
    { append_to_response: TV_APPEND, language: 'en-US' },
    signal
  );
}

export function getSeason(
  tvId: string | number,
  seasonNumber: number,
  signal?: AbortSignal
): Promise<TmdbSeasonDetails> {
  return tmdbGet<TmdbSeasonDetails>(
    `/tv/${tvId}/season/${seasonNumber}`,
    { language: 'en-US' },
    signal
  );
}

export function discoverTvPage(
  params: QueryParams = {},
  signal?: AbortSignal
): Promise<TmdbPage<TmdbTvListItem>> {
  return tmdbGet<TmdbPage<TmdbTvListItem>>(
    '/discover/tv',
    { sort_by: 'popularity.desc', page: 1, ...params },
    signal
  );
}

export async function discoverTv(
  params: QueryParams = {},
  signal?: AbortSignal
): Promise<Title[]> {
  const page = await discoverTvPage(params, signal);
  return page.results.map(normalizeTv);
}

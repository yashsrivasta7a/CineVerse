import { tmdbGet } from './client';
import { normalizeMultiList } from './normalize';
import type { TmdbMultiItem, TmdbPage, Title } from './types';

/**
 * What is actually trending, from TMDB.
 *
 * This replaces the app's own Appwrite search counters, which had two problems:
 * they returned at most four rows, and they were completely empty on a fresh
 * install — a new user's home screen had no trending rail at all.
 *
 * /trending/all returns movies, shows AND people in one array; the normalizer
 * drops the people, which have no poster or rating to render.
 */
export async function getTrending(
  window: 'day' | 'week' = 'day',
  signal?: AbortSignal
): Promise<Title[]> {
  const page = await tmdbGet<TmdbPage<TmdbMultiItem>>(
    `/trending/all/${window}`,
    { language: 'en-US' },
    signal
  );
  return normalizeMultiList(page.results);
}

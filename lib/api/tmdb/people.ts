import { tmdbGet } from './client';
import type { TmdbPage, TmdbPersonDetails, TmdbPersonListItem } from './types';

export function getPerson(
  personId: string | number,
  signal?: AbortSignal
): Promise<TmdbPersonDetails> {
  return tmdbGet<TmdbPersonDetails>(
    `/person/${personId}`,
    { append_to_response: 'combined_credits', language: 'en-US' },
    signal
  );
}

export async function searchPeople(
  query: string,
  signal?: AbortSignal
): Promise<TmdbPersonListItem[]> {
  const page = await tmdbGet<TmdbPage<TmdbPersonListItem>>(
    '/search/person',
    { query, include_adult: false, language: 'en-US', page: 1 },
    signal
  );
  return page.results;
}

/** Seeds the actor picker before the user types anything. */
export async function getPopularPeople(
  signal?: AbortSignal
): Promise<TmdbPersonListItem[]> {
  const page = await tmdbGet<TmdbPage<TmdbPersonListItem>>(
    '/person/popular',
    { language: 'en-US', page: 1 },
    signal
  );
  return page.results.filter((person) => person.known_for_department === 'Acting');
}

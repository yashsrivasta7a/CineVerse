import { tmdbGet } from './client';
import type { MediaType, TmdbCountry, TmdbGenre } from './types';

/**
 * Reference data — genre vocabularies and the country list.
 *
 * All of it is effectively immutable, so callers cache it with
 * `staleTime: Infinity`.
 *
 * Movie and TV genre ids are DIFFERENT vocabularies: TV has 10759
 * Action&Adventure and 10765 Sci-Fi&Fantasy and no 28/12/878 at all. Never
 * reuse one list against the other endpoint.
 */

export async function getGenres(
  kind: MediaType,
  signal?: AbortSignal
): Promise<TmdbGenre[]> {
  const data = await tmdbGet<{ genres: TmdbGenre[] }>(
    `/genre/${kind}/list`,
    { language: 'en' },
    signal
  );
  return data.genres;
}

export async function getCountries(signal?: AbortSignal): Promise<TmdbCountry[]> {
  const data = await tmdbGet<TmdbCountry[]>(
    '/configuration/countries',
    { language: 'en-US' },
    signal
  );
  return [...data].sort((a, b) => a.english_name.localeCompare(b.english_name));
}

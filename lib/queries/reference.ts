import { useQuery } from '@tanstack/react-query';

import { getCountries, getGenres } from '@/lib/api/tmdb/reference';
import { getPopularPeople, searchPeople } from '@/lib/api/tmdb/people';
import type { MediaType } from '@/lib/api/tmdb/types';
import { qk } from './keys';

/** Genre vocabularies never change — cache them for the life of the process. */
export function useGenres(kind: MediaType = 'movie') {
  return useQuery({
    queryKey: qk.genres(kind),
    queryFn: ({ signal }) => getGenres(kind, signal),
    staleTime: Infinity,
  });
}

export function useCountries() {
  return useQuery({
    queryKey: qk.countries(),
    queryFn: ({ signal }) => getCountries(signal),
    staleTime: Infinity,
  });
}

/**
 * Actor picker. With an empty query it falls back to popular actors so the
 * screen is never blank before the user types.
 */
export function usePeopleSearch(query: string) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: qk.search('person', trimmed),
    queryFn: ({ signal }) =>
      trimmed ? searchPeople(trimmed, signal) : getPopularPeople(signal),
    staleTime: trimmed ? 60_000 : Infinity,
  });
}

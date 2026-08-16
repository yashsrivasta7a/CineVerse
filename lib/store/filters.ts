import { create } from 'zustand';

import type { DiscoverParams } from '@/lib/api/tmdb/discover';

export interface FilterState {
  genreIds: number[];
  /** TMDB person id acting as director, via `with_crew`. */
  directorId: number | null;
  directorName: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  minRating: number | null;

  setGenres: (ids: number[]) => void;
  toggleGenre: (id: number) => void;
  setDirector: (id: number | null, name: string | null) => void;
  setYearRange: (from: number | null, to: number | null) => void;
  setMinRating: (value: number | null) => void;
  reset: () => void;
}

const EMPTY = {
  genreIds: [] as number[],
  directorId: null,
  directorName: null,
  yearFrom: null,
  yearTo: null,
  minRating: null,
};

export const useFilters = create<FilterState>((set, get) => ({
  ...EMPTY,

  setGenres: (genreIds) => set({ genreIds }),

  toggleGenre: (id) => {
    const current = get().genreIds;
    set({
      genreIds: current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    });
  },

  setDirector: (directorId, directorName) => set({ directorId, directorName }),
  setYearRange: (yearFrom, yearTo) => set({ yearFrom, yearTo }),
  setMinRating: (minRating) => set({ minRating }),
  reset: () => set(EMPTY),
}));

export function filtersAreActive(state: FilterState): boolean {
  return (
    state.genreIds.length > 0 ||
    state.directorId !== null ||
    state.yearFrom !== null ||
    state.yearTo !== null ||
    state.minRating !== null
  );
}

/** Filters -> TMDB /discover parameters. */
export function paramsFromFilters(state: FilterState): DiscoverParams {
  const params: DiscoverParams = { sort_by: 'popularity.desc' };

  if (state.genreIds.length) params.with_genres = state.genreIds.join(',');
  if (state.directorId !== null) params.with_crew = String(state.directorId);
  if (state.yearFrom !== null) params['primary_release_date.gte'] = `${state.yearFrom}-01-01`;
  if (state.yearTo !== null) params['primary_release_date.lte'] = `${state.yearTo}-12-31`;

  if (state.minRating !== null) {
    params['vote_average.gte'] = state.minRating;
    // Always paired with a rating floor. Without it, "8+" returns obscure
    // titles holding a 10.0 off three votes and the results look broken.
    params['vote_count.gte'] = 200;
  }

  return params;
}

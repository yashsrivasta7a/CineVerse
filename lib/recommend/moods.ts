import type { DiscoverParams } from '@/lib/api/tmdb/discover';

/**
 * Mood -> TMDB /discover parameters.
 *
 * Movie and TV genre ids are DIFFERENT vocabularies — TV has 10759
 * Action&Adventure and 10765 Sci-Fi&Fantasy, and no 28/12/878 at all. Each
 * profile therefore carries a separate set per media type rather than one
 * shared list. Phase 6 fills in the TV side when the TV endpoints land.
 */
export interface MoodProfile {
  label: string;
  /** Pipe-joined = OR. */
  movieGenres: number[];
  tvGenres: number[];
  withoutGenres?: number[];
  minRating?: number;
  maxRuntime?: number;
  sortBy?: DiscoverParams['sort_by'];
}

/** Indexed to match MOOD_STOPS in components/media/MoodSlider. */
export const MOOD_PROFILES: MoodProfile[] = [
  {
    // Feeling bad -> comfort watching: light, short, reliably likeable.
    label: 'BAD',
    movieGenres: [35, 10751, 16],
    tvGenres: [35, 10751, 16],
    withoutGenres: [27, 53],
    minRating: 6.5,
    maxRuntime: 110,
  },
  {
    label: 'MEH',
    movieGenres: [53, 80, 9648],
    tvGenres: [80, 9648],
    minRating: 6.8,
  },
  {
    label: 'NORMAL',
    movieGenres: [12, 28, 35],
    tvGenres: [10759, 35],
    sortBy: 'popularity.desc',
  },
  {
    label: 'GOOD',
    movieGenres: [10402, 10749, 12],
    tvGenres: [10749, 10759],
  },
  {
    label: 'GREAT',
    movieGenres: [18, 36, 99],
    tvGenres: [18, 99],
    minRating: 7.2,
    sortBy: 'vote_average.desc',
  },
];

export function paramsFromMood(moodIndex: number): DiscoverParams {
  const profile = MOOD_PROFILES[moodIndex] ?? MOOD_PROFILES[2];

  const params: DiscoverParams = {
    with_genres: profile.movieGenres.join('|'),
    sort_by: profile.sortBy ?? 'popularity.desc',
  };

  if (profile.withoutGenres?.length) {
    params.without_genres = profile.withoutGenres.join(',');
  }

  if (profile.minRating !== undefined) {
    params['vote_average.gte'] = profile.minRating;
    // Not optional. Without a vote floor, a rating filter surfaces obscure
    // titles holding a 10.0 off three votes and the whole rail looks broken.
    params['vote_count.gte'] = 200;
  }

  if (profile.maxRuntime !== undefined) {
    params['with_runtime.lte'] = profile.maxRuntime;
  }

  return params;
}

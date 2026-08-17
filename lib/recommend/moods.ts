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
  /**
   * What the rail for this mood is called on screen, and what it holds.
   *
   * The copy lives beside the parameters rather than in the component: a rail
   * headed "BAD" would be naming the user's mood back at them, when what the
   * heading has to describe is the films underneath it. Change the genres here
   * and the promise in the heading changes with them, in one place.
   */
  railTitle: string;
  railSubtitle: string;
  /** Pipe-joined = OR. */
  movieGenres: number[];
  tvGenres: number[];
  withoutGenres?: number[];
  minRating?: number;
  maxRuntime?: number;
  sortBy?: DiscoverParams['sort_by'];
}

/**
 * The dial's stops, in order. Index is the mood value stored in preferences.
 *
 * Lives beside the profiles rather than in the control that draws it: the two
 * are one list read two ways, and when the labels sat in a component the
 * profiles below could only claim to be "indexed to match" them. Now a stop
 * without a profile is a type error.
 */
export const MOOD_STOPS = ['BAD', 'MEH', 'NORMAL', 'GOOD', 'GREAT'] as const;

export type MoodStop = (typeof MOOD_STOPS)[number];

/** One profile per entry in MOOD_STOPS, in the same order. */
export const MOOD_PROFILES: MoodProfile[] = [
  {
    // Feeling bad -> comfort watching: light, short, reliably likeable.
    label: 'BAD',
    railTitle: 'Comfort watching',
    railSubtitle: 'Light, short, and easy to sit with',
    movieGenres: [35, 10751, 16],
    tvGenres: [35, 10751, 16],
    withoutGenres: [27, 53],
    minRating: 6.5,
    maxRuntime: 110,
  },
  {
    label: 'MEH',
    railTitle: 'Something gripping',
    railSubtitle: 'Thrillers, crime, and mysteries',
    movieGenres: [53, 80, 9648],
    tvGenres: [80, 9648],
    minRating: 6.8,
  },
  {
    label: 'NORMAL',
    railTitle: 'Crowd pleasers',
    railSubtitle: 'Big, popular, easy to start',
    movieGenres: [12, 28, 35],
    tvGenres: [10759, 35],
    sortBy: 'popularity.desc',
  },
  {
    label: 'GOOD',
    railTitle: 'Feel-good picks',
    railSubtitle: 'Romance, music, and adventure',
    movieGenres: [10402, 10749, 12],
    tvGenres: [10749, 10759],
  },
  {
    label: 'GREAT',
    railTitle: 'Worth your full attention',
    railSubtitle: 'Drama, history, and documentary',
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

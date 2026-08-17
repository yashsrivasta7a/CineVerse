/**
 * TMDB wire shapes, plus the app's own unified media model.
 *
 * `Title` is the single shape every list, rail, card and deck consumes. TMDB
 * itself disagrees with itself — movies have `title`/`release_date`, TV has
 * `name`/`first_air_date`, and /search/multi and /trending/all return both in
 * one array. Normalizing once at the API boundary is what keeps `?? name`
 * branches out of the component tree.
 */

export type MediaType = 'movie' | 'tv';

export interface Title {
  id: number;
  mediaType: MediaType;
  title: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  /** Release date (movie) or first air date (TV). ISO `YYYY-MM-DD`. */
  date: string | null;
  voteAverage: number;
  voteCount: number;
  genreIds: number[];
  originCountry: string[];
  /** TMDB popularity — the taste vector's reach axis reads it. */
  popularity: number;
  /** ISO 639-1 original language — the taste vector's language axis. */
  originalLanguage: string;
}

export interface TmdbPage<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovieListItem {
  id: number;
  title: string;
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  release_date: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export interface TmdbTvListItem {
  id: number;
  name: string;
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
}

export type TmdbMultiItem =
  | (TmdbMovieListItem & { media_type: 'movie' })
  | (TmdbTvListItem & { media_type: 'tv' })
  | { media_type: 'person'; id: number; name: string };

export interface TmdbPersonListItem {
  id: number;
  name: string;
  profile_path: string | null;
  popularity: number;
  known_for_department: string;
}

export interface TmdbCountry {
  iso_3166_1: string;
  english_name: string;
  native_name: string;
}

/* ------------------------------------------------------- appended blocks */

export interface TmdbCastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profile_path: string | null;
}

export interface TmdbCredits {
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

/**
 * TV uses `aggregate_credits`, whose cast carry a `roles[]` array instead of a
 * single `character` — a performer can play several parts across a run.
 */
export interface TmdbAggregateCastMember {
  id: number;
  name: string;
  profile_path: string | null;
  order: number;
  roles: { character: string; episode_count: number }[];
}

export interface TmdbAggregateCredits {
  cast: TmdbAggregateCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TmdbReview {
  id: string;
  author: string;
  content: string;
  created_at: string;
  url: string;
  author_details: {
    name: string;
    username: string;
    avatar_path: string | null;
    rating: number | null;
  };
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
}

export interface TmdbWatchProviderRegion {
  link: string;
  flatrate?: TmdbProvider[];
  free?: TmdbProvider[];
  ads?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
}

/** Keyed by ISO 3166-1 region code. */
export interface TmdbWatchProviders {
  results: Record<string, TmdbWatchProviderRegion | undefined>;
}

/* ------------------------------------------------------------------- TV */

export interface TmdbSeasonSummary {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

export interface TmdbEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  air_date: string | null;
  still_path: string | null;
  runtime: number | null;
  vote_average: number;
}

/** One frame TMDB holds for an episode, from `append_to_response=images`. */
export interface TmdbStill {
  file_path: string;
  width: number;
  height: number;
  aspect_ratio: number;
}

/**
 * The single-episode payload.
 *
 * `crew` and `guest_stars` are episode-specific and come back by DEFAULT — they
 * are not the show's `aggregate_credits` narrowed down, and appending `credits`
 * to get them would instead return the season's regular cast, which is a
 * different (and far less interesting) list. Only `images` needs appending.
 */
export interface TmdbEpisodeDetails extends TmdbEpisode {
  vote_count: number;
  production_code: string | null;
  crew: TmdbCrewMember[];
  guest_stars: TmdbCastMember[];
  images?: { stills: TmdbStill[] };
}

export interface TmdbTvDetails {
  adult: boolean;
  backdrop_path: string | null;
  created_by: { id: number; name: string; profile_path: string | null }[];
  episode_run_time: number[];
  first_air_date: string;
  last_air_date: string | null;
  genres: TmdbGenre[];
  homepage: string | null;
  id: number;
  in_production: boolean;
  name: string;
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_language: string;
  original_name: string;
  overview: string | null;
  popularity: number;
  poster_path: string | null;
  production_companies: {
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }[];
  production_countries: { iso_3166_1: string; name: string }[];
  seasons: TmdbSeasonSummary[];
  status: string;
  tagline: string | null;
  type: string;
  vote_average: number;
  vote_count: number;

  /** Present only when requested via append_to_response. */
  aggregate_credits?: TmdbAggregateCredits;
  videos?: { results: TmdbVideo[] };
  reviews?: TmdbPage<TmdbReview>;
  recommendations?: TmdbPage<TmdbTvListItem>;
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
  'watch/providers'?: TmdbWatchProviders;
}

export interface TmdbSeasonDetails {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  air_date: string | null;
  poster_path: string | null;
  episodes: TmdbEpisode[];
}

export interface TmdbPersonDetails extends TmdbPersonListItem {
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  combined_credits?: {
    cast: (TmdbMovieListItem | TmdbTvListItem)[];
  };
}

/**
 * Kept field-for-field identical to the legacy global `MovieDetails` in
 * interfaces/interfaces.d.ts so both can coexist during the migration. That
 * ambient file is deleted in Phase 3, at which point this becomes the only
 * definition.
 */
export interface TmdbMovieDetails {
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string;
    backdrop_path: string;
  } | null;
  budget: number;
  genres: TmdbGenre[];
  homepage: string | null;
  id: number;
  imdb_id: string | null;
  original_language: string;
  original_title: string;
  overview: string | null;
  popularity: number;
  poster_path: string | null;
  production_companies: {
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }[];
  production_countries: {
    iso_3166_1: string;
    name: string;
  }[];
  release_date: string;
  revenue: number;
  runtime: number | null;
  spoken_languages: {
    english_name: string;
    iso_639_1: string;
    name: string;
  }[];
  status: string;
  tagline: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;

  /** Present only when requested via append_to_response. */
  credits?: TmdbCredits;
  videos?: { results: TmdbVideo[] };
  reviews?: TmdbPage<TmdbReview>;
  recommendations?: TmdbPage<TmdbMovieListItem>;
  'watch/providers'?: TmdbWatchProviders;
}

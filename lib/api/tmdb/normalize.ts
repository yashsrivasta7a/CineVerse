import type {
  TmdbMovieDetails,
  TmdbMovieListItem,
  TmdbMultiItem,
  TmdbTvListItem,
  Title,
} from './types';

/**
 * Conversion into the unified `Title` model. Every list endpoint funnels
 * through here so that no component downstream ever has to write
 * `item.title ?? item.name`.
 */

export function normalizeMovie(movie: TmdbMovieListItem): Title {
  return {
    id: movie.id,
    mediaType: 'movie',
    title: movie.title || movie.original_title || 'Untitled',
    overview: movie.overview ?? '',
    posterPath: movie.poster_path,
    backdropPath: movie.backdrop_path,
    date: movie.release_date || null,
    voteAverage: movie.vote_average ?? 0,
    voteCount: movie.vote_count ?? 0,
    genreIds: movie.genre_ids ?? [],
    // Movie list items carry no origin_country; only /discover with
    // with_origin_country or the detail endpoint can supply it.
    originCountry: [],
  };
}

export function normalizeTv(show: TmdbTvListItem): Title {
  return {
    id: show.id,
    mediaType: 'tv',
    title: show.name || show.original_name || 'Untitled',
    overview: show.overview ?? '',
    posterPath: show.poster_path,
    backdropPath: show.backdrop_path,
    date: show.first_air_date || null,
    voteAverage: show.vote_average ?? 0,
    voteCount: show.vote_count ?? 0,
    genreIds: show.genre_ids ?? [],
    originCountry: show.origin_country ?? [],
  };
}

/**
 * /search/multi and /trending/all mix movies, shows and people in one array.
 * People have no poster or rating and are not renderable as a Title, so they
 * are dropped rather than coerced.
 */
export function normalizeMulti(item: TmdbMultiItem): Title | null {
  switch (item.media_type) {
    case 'movie':
      return normalizeMovie(item);
    case 'tv':
      return normalizeTv(item);
    default:
      return null;
  }
}

export function normalizeMultiList(items: TmdbMultiItem[]): Title[] {
  return items
    .map(normalizeMulti)
    .filter((title): title is Title => title !== null);
}

export function normalizeMovieDetails(details: TmdbMovieDetails): Title {
  return {
    id: details.id,
    mediaType: 'movie',
    title: details.title || details.original_title || 'Untitled',
    overview: details.overview ?? '',
    posterPath: details.poster_path,
    backdropPath: details.backdrop_path,
    date: details.release_date || null,
    voteAverage: details.vote_average ?? 0,
    voteCount: details.vote_count ?? 0,
    genreIds: details.genres?.map((genre) => genre.id) ?? [],
    originCountry:
      details.production_countries?.map((country) => country.iso_3166_1) ?? [],
  };
}

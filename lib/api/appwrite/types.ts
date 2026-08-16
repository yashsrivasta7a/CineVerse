/**
 * Appwrite document shapes.
 *
 * Previously these lived as ambient globals in interfaces/interfaces.d.ts with
 * no exports, which meant nothing could import them and everything could see
 * them. Phase 2 replaces the collections themselves; this file exists so the
 * ambient file can be deleted now.
 */

export interface TrendingMovie {
  searchTerm: string;
  movie_id: number;
  title: string;
  count: number;
  poster_url: string;
}

export interface BookmarkDocument {
  $id: string;
  userId: string;
  movieId: number;
  title: string;
  bookmarkId: number;
  createdDate: string;
}

/** The minimum a caller must supply to record a search hit. */
export interface SearchCountSubject {
  id: number;
  title: string;
  poster_path: string | null;
}

/** The minimum a caller must supply to bookmark something. */
export interface BookmarkSubject {
  id: number;
  title: string;
}

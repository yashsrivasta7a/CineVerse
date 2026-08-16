/**
 * TMDB image URL construction.
 *
 * Sizes matter for more than sharpness: `original` backdrops are routinely
 * 2-4 MB, which a swipe deck prefetching five cards ahead would turn into a
 * data-plan problem. Prefer the smallest size that covers the render box.
 */

const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type PosterSize = 'w154' | 'w185' | 'w342' | 'w500' | 'original';
export type BackdropSize = 'w300' | 'w780' | 'w1280' | 'original';
export type ProfileSize = 'w45' | 'w185' | 'h632' | 'original';
export type LogoSize = 'w45' | 'w92' | 'w154' | 'w185' | 'w300' | 'original';
export type StillSize = 'w92' | 'w185' | 'w300' | 'original';

/**
 * Appwrite stores fully-qualified poster URLs on its metrics documents, so any
 * path reaching this layer may already be absolute.
 */
function build(path: string | null | undefined, size: string): string | null {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${IMAGE_BASE}/${size}${path.startsWith('/') ? '' : '/'}${path}`;
}

export const posterUrl = (path: string | null | undefined, size: PosterSize = 'w500') =>
  build(path, size);

export const backdropUrl = (path: string | null | undefined, size: BackdropSize = 'w780') =>
  build(path, size);

export const profileUrl = (path: string | null | undefined, size: ProfileSize = 'w185') =>
  build(path, size);

export const logoUrl = (path: string | null | undefined, size: LogoSize = 'w185') =>
  build(path, size);

export const stillUrl = (path: string | null | undefined, size: StillSize = 'w300') =>
  build(path, size);

/** The previous placeholder pointed at `placehold.com`, which does not resolve. */
export const POSTER_PLACEHOLDER = 'https://placehold.co/600x900/1a1a1a/ffffff.png';
export const BACKDROP_PLACEHOLDER = 'https://placehold.co/1280x720/1a1a1a/ffffff.png';

export const posterUrlOrPlaceholder = (
  path: string | null | undefined,
  size: PosterSize = 'w500'
) => posterUrl(path, size) ?? POSTER_PLACEHOLDER;

export const backdropUrlOrPlaceholder = (
  path: string | null | undefined,
  size: BackdropSize = 'w780'
) => backdropUrl(path, size) ?? BACKDROP_PLACEHOLDER;

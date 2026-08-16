import type { DiscoverParams } from '@/lib/api/tmdb/discover';

/**
 * Named discover presets.
 *
 * Rails are DATA, not JSX — the Selection screen maps over descriptors, and the
 * generic collection screen resolves a slug back to params. Adding a rail is
 * one entry here rather than a new component and a new screen.
 */
export interface CollectionPreset {
  slug: string;
  title: string;
  subtitle?: string;
  params: DiscoverParams;
}

const CURRENT_YEAR = new Date().getFullYear();

export const PRESETS: Record<string, CollectionPreset> = {
  popular: {
    slug: 'popular',
    title: 'Popular now',
    subtitle: 'What everyone is watching',
    params: { sort_by: 'popularity.desc' },
  },
  acclaimed: {
    slug: 'acclaimed',
    title: 'Acclaimed',
    subtitle: 'Highly rated, widely seen',
    params: {
      sort_by: 'vote_average.desc',
      'vote_average.gte': 7.5,
      // Mandatory alongside any rating floor. Without it this fills with
      // obscure titles holding a 10.0 off three votes.
      'vote_count.gte': 500,
    },
  },
  thisYear: {
    slug: 'thisYear',
    title: `Best of ${CURRENT_YEAR}`,
    subtitle: 'The year so far',
    params: {
      sort_by: 'vote_average.desc',
      primary_release_year: CURRENT_YEAR,
      'vote_count.gte': 150,
    },
  },
  shortWatch: {
    slug: 'shortWatch',
    title: 'Under 100 minutes',
    subtitle: 'When time is short',
    params: {
      sort_by: 'popularity.desc',
      'with_runtime.lte': 100,
      'vote_count.gte': 200,
    },
  },
};

export function presetBySlug(slug: string): CollectionPreset | null {
  return PRESETS[slug] ?? null;
}

/** A rail built from one of the user's liked genres. */
export function genreRail(genreId: number, genreName: string): CollectionPreset {
  return {
    slug: `genre-${genreId}`,
    title: genreName,
    subtitle: `Because you like ${genreName.toLowerCase()}`,
    params: {
      sort_by: 'popularity.desc',
      with_genres: String(genreId),
      'vote_count.gte': 100,
    },
  };
}

/** A rail built from one of the user's liked actors. */
export function personRail(personId: number, personName: string): CollectionPreset {
  return {
    slug: `person-${personId}`,
    title: personName,
    subtitle: `Because you like ${personName}`,
    // `with_cast` is far too narrow for the deck, but it is exactly right here:
    // a rail is allowed to be small.
    params: { sort_by: 'popularity.desc', with_cast: String(personId) },
  };
}

import type { DiscoverParams } from '@/lib/api/tmdb/discover';
import { MOOD_PROFILES, paramsFromMood } from './moods';

/**
 * Rail descriptors.
 *
 * Rails are DATA, not JSX — the Selection screen maps over descriptors, and the
 * generic collection screen resolves a slug back to params. Every rail is
 * GENERATED from the user's own state (mood, taste vector, stated likes); the
 * old hardcoded PRESETS list is gone because a rail identical on everyone's
 * phone was backfill, not selection.
 */
export interface CollectionPreset {
  slug: string;
  title: string;
  subtitle?: string;
  params: DiscoverParams;
}

/**
 * The rail for the mood the user is currently in.
 *
 * Returns null for an unset mood rather than falling back to a default profile,
 * which is what `paramsFromMood` does. A silent default would put a rail on the
 * page claiming to match a mood nobody chose.
 */
export function moodRail(moodIndex: number | null): CollectionPreset | null {
  if (moodIndex === null) return null;

  const profile = MOOD_PROFILES[moodIndex];
  if (!profile) return null;

  return {
    slug: `mood-${moodIndex}`,
    title: profile.railTitle,
    subtitle: profile.railSubtitle,
    params: paramsFromMood(moodIndex),
  };
}

/**
 * A rail built from one of the user's genres. The subtitle names the SOURCE
 * honestly: a stated onboarding like reads "because you like", a learned one
 * reads "you keep saying yes" — the app never claims the user said something
 * they only swiped.
 */
export function genreRail(
  genreId: number,
  genreName: string,
  source: 'stated' | 'learned' = 'stated'
): CollectionPreset {
  return {
    slug: `genre-${genreId}`,
    title: genreName,
    subtitle:
      source === 'learned'
        ? `You keep saying yes to ${genreName.toLowerCase()}`
        : `Because you like ${genreName.toLowerCase()}`,
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

/**
 * The exploration lane, as a rail. Same params the deck's wildcard probe uses,
 * so the rail and the every-4th card are honestly the same feature.
 */
export function wildcardRail(params: DiscoverParams): CollectionPreset {
  return {
    slug: 'off-usual',
    title: 'Off your usual',
    subtitle: 'Acclaimed picks outside your lane',
    params,
  };
}

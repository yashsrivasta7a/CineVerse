import type { TasteSignal, Verdict } from '@/db/queries/verdicts';
import type { Title } from '@/lib/api/tmdb/types';

/**
 * The taste vector: what the deck has learned from swipes, on five axes.
 *
 * Pure data + pure functions. No React, no network, no storage — build it from
 * history, mutate it per swipe, score any Title against it. This is the whole
 * recommender; everything else is fetching and display.
 *
 * Axis affinities are raw weighted sums, deliberately unnormalised: every axis
 * grows roughly linearly with sample count, so their relative order — the only
 * thing ranking reads — is stable without the divide.
 */
export interface TasteVector {
  /** Genre id -> affinity. Positive = drawn to, negative = pushed away. */
  genres: Record<number, number>;
  /** Decade start year ("1990") -> affinity. */
  decades: Record<string, number>;
  /** ISO 639-1 code -> affinity. */
  languages: Record<string, number>;
  /** Blockbuster (+) vs deep-cut (-) lean. */
  reach: number;
  /** Chases ratings (+) vs indifferent (-). */
  acclaim: number;
  /** Total verdicts absorbed — gates whether learning applies at all. */
  samples: number;
}

/**
 * The deck's four outcomes are not equally informative. Someone who watched a
 * film and disliked it is telling you far more than someone who passed on a
 * poster:
 *
 *   watched + liked     +2    interested          +1
 *   watched + disliked  -2    not for me          -1
 */
function weigh(verdict: Verdict, seen: boolean): number {
  if (verdict === 'skip') return 0;
  const magnitude = seen ? 2 : 1;
  return verdict === 'up' ? magnitude : -magnitude;
}

/** "2014-06-27" -> "2010". Null in, null out. */
function decadeOf(date: string | null): string | null {
  const year = Number(date?.slice(0, 4));
  return Number.isFinite(year) && year > 1800 ? String(Math.floor(year / 10) * 10) : null;
}

/**
 * TMDB popularity mapped onto [-1, +1]: ~0 popularity -> -1 (deep cut),
 * ~28 -> 0, blockbuster -> +1. tanh keeps outliers (popularity in the
 * thousands during a release week) from dominating the axis.
 */
function reachOf(popularity: number): number {
  return Math.tanh(popularity / 40) * 2 - 1;
}

/** Vote average mapped onto roughly [-1, +1] around the 6.5 midpoint. */
function acclaimOf(voteAverage: number): number {
  return Math.max(-1, Math.min(1, (voteAverage - 6.5) / 3.5));
}

export function emptyVector(): TasteVector {
  return { genres: {}, decades: {}, languages: {}, reach: 0, acclaim: 0, samples: 0 };
}

/** One verdict absorbed into the vector. O(genres of the title). Mutates. */
export function updateVector(
  vector: TasteVector,
  title: Pick<Title, 'genreIds' | 'date' | 'originalLanguage' | 'popularity' | 'voteAverage'>,
  verdict: Verdict,
  seen: boolean
): void {
  const w = weigh(verdict, seen);
  if (w === 0) return;

  for (const genre of title.genreIds) {
    vector.genres[genre] = (vector.genres[genre] ?? 0) + w;
  }

  const decade = decadeOf(title.date);
  if (decade) vector.decades[decade] = (vector.decades[decade] ?? 0) + w;

  if (title.originalLanguage) {
    vector.languages[title.originalLanguage] =
      (vector.languages[title.originalLanguage] ?? 0) + w;
  }

  if (title.popularity > 0) vector.reach += w * reachOf(title.popularity);
  if (title.voteAverage > 0) vector.acclaim += w * acclaimOf(title.voteAverage);

  vector.samples += 1;
}

/** The full history replayed into a fresh vector. Event sourcing, literally. */
export function buildVector(signals: TasteSignal[]): TasteVector {
  const vector = emptyVector();
  for (const signal of signals) {
    updateVector(
      vector,
      {
        genreIds: signal.genreIds,
        date: signal.date,
        originalLanguage: signal.originalLanguage ?? '',
        popularity: signal.popularity ?? 0,
        voteAverage: signal.voteAverage ?? 0,
      },
      signal.verdict,
      signal.seen
    );
  }
  return vector;
}

/**
 * How much this user would rate this title, given everything swiped so far.
 *
 * Weights are judgement, not science: genre is what a film IS, so it carries
 * double; era and language are strong habits; reach and acclaim are leans, so
 * they only nudge. With an empty vector every score is 0 and the caller's
 * fetch order (popularity) stands — that is the cold-start behaviour, free.
 */
export function scoreTitle(title: Title, vector: TasteVector): number {
  let genreAffinity = 0;
  for (const genre of title.genreIds) genreAffinity += vector.genres[genre] ?? 0;
  if (title.genreIds.length) genreAffinity /= title.genreIds.length;

  const decade = decadeOf(title.date);

  return (
    2 * genreAffinity +
    (decade ? vector.decades[decade] ?? 0 : 0) +
    (vector.languages[title.originalLanguage] ?? 0) +
    0.5 * vector.reach * reachOf(title.popularity) +
    0.5 * vector.acclaim * acclaimOf(title.voteAverage)
  );
}

/** Verdicts required before learning is allowed to shape a QUERY (not order). */
const MIN_SAMPLES = 12;

/** Genre ids the vector is most drawn to, strongest first. */
export function topGenres(vector: TasteVector, limit: number): string[] {
  return Object.entries(vector.genres)
    .filter(([, score]) => score >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre]) => genre);
}

export interface LearnedTaste {
  /** Genre ids to favour in the probe query, strongest first. */
  boostGenres: string[];
  /** Genre ids the user has consistently rejected. */
  avoidGenres: string[];
  sampleSize: number;
}

export const NO_LEARNED_TASTE: LearnedTaste = {
  boostGenres: [],
  avoidGenres: [],
  sampleSize: 0,
};

/**
 * The vector reduced to what a /discover query can express. Below MIN_SAMPLES
 * nothing is applied — acting on four swipes narrows the deck around whatever
 * the user happened to see first.
 */
export function learnedTaste(vector: TasteVector): LearnedTaste {
  if (vector.samples < MIN_SAMPLES) {
    return { ...NO_LEARNED_TASTE, sampleSize: vector.samples };
  }

  return {
    boostGenres: topGenres(vector, 3),
    avoidGenres: Object.entries(vector.genres)
      .filter(([, score]) => score <= -3)
      .sort((a, b) => a[1] - b[1])
      .map(([genre]) => genre),
    sampleSize: vector.samples,
  };
}

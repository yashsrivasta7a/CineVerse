import type { TasteSignal } from '@/db/queries/verdicts';

/**
 * Swipe history -> learned genre taste.
 *
 * The deck's four outcomes are not equally informative, so they do not weigh
 * equally. Someone who watched a film and disliked it is telling you far more
 * than someone who passed on a poster:
 *
 *   watched + liked     +2   they saw it through and it landed
 *   interested          +1   the poster and premise appealed, unproven
 *   not for me          -1   nothing about it appealed, unproven
 *   watched + disliked  -2   they gave it the time and it failed
 *
 * Only genres come out of this. Cast and crew would need a TMDB detail fetch
 * per judged id — hundreds of requests — and the deck stores genres precisely
 * because it already had them.
 */

/** Weight of one verdict, by its position in the 2x2. */
function weigh(signal: TasteSignal): number {
  if (signal.verdict === 'skip') return 0;
  const magnitude = signal.seen ? 2 : 1;
  return signal.verdict === 'up' ? magnitude : -magnitude;
}

/**
 * Verdicts required before any of this is applied.
 *
 * Below this the sample is noise, and acting on noise narrows the deck around
 * whatever the user happened to see first — which reads as the app deciding
 * their taste for them after four swipes.
 */
const MIN_VERDICTS = 12;

/** Times a genre must have been judged before its score is trusted. */
const MIN_GENRE_SAMPLES = 3;

/** Score at which a genre is boosted, and at which it is dropped entirely. */
const BOOST_AT = 3;
const AVOID_AT = -3;

/**
 * Cap on boosted genres.
 *
 * `with_genres` joined with `|` is an OR, so more genres widen the deck rather
 * than narrowing it — but past a handful the query stops expressing a taste and
 * starts expressing "most films".
 */
const MAX_BOOST = 3;

export interface LearnedTaste {
  /** Genre ids to favour, strongest first. */
  boostGenres: string[];
  /** Genre ids the user has consistently rejected. */
  avoidGenres: string[];
  /** Judged titles behind this, for the caller's own gating and for debugging. */
  sampleSize: number;
}

export const NO_LEARNED_TASTE: LearnedTaste = {
  boostGenres: [],
  avoidGenres: [],
  sampleSize: 0,
};

export function weighVerdicts(signals: TasteSignal[]): LearnedTaste {
  if (signals.length < MIN_VERDICTS) {
    return { ...NO_LEARNED_TASTE, sampleSize: signals.length };
  }

  const score = new Map<number, number>();
  const samples = new Map<number, number>();

  for (const signal of signals) {
    const weight = weigh(signal);
    if (weight === 0) continue;

    for (const genre of signal.genreIds) {
      score.set(genre, (score.get(genre) ?? 0) + weight);
      samples.set(genre, (samples.get(genre) ?? 0) + 1);
    }
  }

  const trusted = [...score.entries()].filter(
    ([genre]) => (samples.get(genre) ?? 0) >= MIN_GENRE_SAMPLES
  );

  const boostGenres = trusted
    .filter(([, value]) => value >= BOOST_AT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_BOOST)
    .map(([genre]) => String(genre));

  const avoidGenres = trusted
    .filter(([, value]) => value <= AVOID_AT)
    .sort((a, b) => a[1] - b[1])
    .map(([genre]) => String(genre));

  return { boostGenres, avoidGenres, sampleSize: signals.length };
}

import { db } from '../client';
import type { MediaType } from '@/lib/api/tmdb/types';

export type Verdict = 'up' | 'down' | 'skip';

export interface VerdictRow {
  media_type: MediaType;
  tmdb_id: number;
  verdict: Verdict;
  /** 1 when the user marked the title as already watched. */
  seen: number;
  /** Comma-separated TMDB genre ids, captured from the card at commit time. */
  genre_ids: string | null;
  reaction: string | null;
  created_at: number;
  synced: number;
}

export interface RecordVerdictOptions {
  /** The user told us they had already watched it. */
  seen?: boolean;
  /** Genres of the judged title, so ranking never has to refetch it. */
  genreIds?: number[];
  reaction?: string | null;
}

/**
 * Swipe verdicts.
 *
 * Two axes, not one. `verdict` is the direction and `seen` is whether the user
 * had already watched it, which together give four distinct outcomes:
 *
 *   up   + unseen -> Interested      (weak positive, and the only one that saves)
 *   down + unseen -> Not for me      (weak negative)
 *   up   + seen   -> Watched, liked  (strong positive)
 *   down + seen   -> Watched, disliked (strong negative)
 *
 * Kept as two columns rather than four verdict values because that is what it
 * actually is — a 2x2 — and because it leaves every row written before the
 * `seen` column existed valid and correctly interpreted as unseen.
 *
 * Written synchronously so the deck never awaits the network on a swipe, with
 * `synced = 0` acting as an outbox for the Appwrite flush in Phase 2. The
 * exclusion set is a SQL query rather than a parsed JSON blob, which is the
 * whole reason this is a relational store: after a few hundred swipes it is
 * still a single indexed read.
 */
export function recordVerdict(
  mediaType: MediaType,
  tmdbId: number,
  verdict: Verdict,
  options: RecordVerdictOptions = {}
): void {
  const genres = options.genreIds?.length ? options.genreIds.join(',') : null;

  db.runSync(
    `INSERT INTO verdicts (media_type, tmdb_id, verdict, seen, genre_ids, reaction, created_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(media_type, tmdb_id) DO UPDATE SET
       verdict    = excluded.verdict,
       seen       = excluded.seen,
       -- A re-judgement can arrive from a screen that has no genre list to
       -- hand. Keeping the stored one is strictly better than nulling it.
       genre_ids  = COALESCE(excluded.genre_ids, verdicts.genre_ids),
       reaction   = excluded.reaction,
       created_at = excluded.created_at,
       synced     = 0`,
    [
      mediaType,
      tmdbId,
      verdict,
      options.seen ? 1 : 0,
      genres,
      options.reaction ?? null,
      Date.now(),
    ]
  );
}

/** Every title already judged — the deck's exclusion set. */
export function getVerdictIds(mediaType: MediaType): number[] {
  const rows = db.getAllSync<{ tmdb_id: number }>(
    'SELECT tmdb_id FROM verdicts WHERE media_type = ?',
    [mediaType]
  );
  return rows.map((row) => row.tmdb_id);
}

/** One judged title, reduced to what ranking actually reads. */
export interface TasteSignal {
  tmdbId: number;
  verdict: Verdict;
  seen: boolean;
  genreIds: number[];
}

/**
 * The judged history, for `lib/recommend/rank`.
 *
 * Rows with no captured genres are dropped rather than returned empty: they
 * carry no usable signal, and letting them through would only dilute the
 * sample count that gates whether learning applies at all.
 */
export function getTasteSignals(mediaType: MediaType): TasteSignal[] {
  const rows = db.getAllSync<Pick<VerdictRow, 'tmdb_id' | 'verdict' | 'seen' | 'genre_ids'>>(
    `SELECT tmdb_id, verdict, seen, genre_ids FROM verdicts
     WHERE media_type = ? AND genre_ids IS NOT NULL AND genre_ids <> ''`,
    [mediaType]
  );

  return rows.map((row) => ({
    tmdbId: row.tmdb_id,
    verdict: row.verdict,
    seen: row.seen === 1,
    genreIds: row.genre_ids!.split(',').map(Number).filter(Number.isFinite),
  }));
}

export function getVerdictCounts(): {
  up: number;
  down: number;
  seen: number;
  total: number;
} {
  const row = db.getFirstSync<{
    up: number;
    down: number;
    seen: number;
    total: number;
  }>(
    `SELECT
       SUM(CASE WHEN verdict = 'up'   THEN 1 ELSE 0 END) AS up,
       SUM(CASE WHEN verdict = 'down' THEN 1 ELSE 0 END) AS down,
       SUM(CASE WHEN seen    = 1      THEN 1 ELSE 0 END) AS seen,
       COUNT(*) AS total
     FROM verdicts`
  );
  return {
    up: row?.up ?? 0,
    down: row?.down ?? 0,
    seen: row?.seen ?? 0,
    total: row?.total ?? 0,
  };
}

export function clearVerdicts(): void {
  db.runSync('DELETE FROM verdicts');
}

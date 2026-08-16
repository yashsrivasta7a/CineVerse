import { db } from '../client';
import type { MediaType } from '@/lib/api/tmdb/types';

export type Verdict = 'up' | 'down' | 'skip';

export interface VerdictRow {
  media_type: MediaType;
  tmdb_id: number;
  verdict: Verdict;
  reaction: string | null;
  created_at: number;
  synced: number;
}

/**
 * Swipe verdicts.
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
  reaction?: string | null
): void {
  db.runSync(
    `INSERT INTO verdicts (media_type, tmdb_id, verdict, reaction, created_at, synced)
     VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(media_type, tmdb_id) DO UPDATE SET
       verdict    = excluded.verdict,
       reaction   = excluded.reaction,
       created_at = excluded.created_at,
       synced     = 0`,
    [mediaType, tmdbId, verdict, reaction ?? null, Date.now()]
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

export function getVerdictCounts(): { up: number; down: number; total: number } {
  const row = db.getFirstSync<{ up: number; down: number; total: number }>(
    `SELECT
       SUM(CASE WHEN verdict = 'up'   THEN 1 ELSE 0 END) AS up,
       SUM(CASE WHEN verdict = 'down' THEN 1 ELSE 0 END) AS down,
       COUNT(*) AS total
     FROM verdicts`
  );
  return { up: row?.up ?? 0, down: row?.down ?? 0, total: row?.total ?? 0 };
}

export function clearVerdicts(): void {
  db.runSync('DELETE FROM verdicts');
}

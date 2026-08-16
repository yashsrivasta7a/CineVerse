import { db } from '../client';

/**
 * Watched episodes.
 *
 * This is what makes "Continue Watching" honest. The app has no playback, so a
 * progress bar is only truthful if the user tells it what they have seen —
 * hence a per-episode toggle rather than an invented percentage.
 */

export function markEpisodeWatched(
  tvId: number,
  season: number,
  episode: number
): void {
  db.runSync(
    `INSERT INTO watched_episodes (tv_id, season, episode, watched_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tv_id, season, episode) DO NOTHING`,
    [tvId, season, episode, Date.now()]
  );
}

export function unmarkEpisodeWatched(
  tvId: number,
  season: number,
  episode: number
): void {
  db.runSync(
    'DELETE FROM watched_episodes WHERE tv_id = ? AND season = ? AND episode = ?',
    [tvId, season, episode]
  );
}

export function getWatchedEpisodes(
  tvId: number
): { season: number; episode: number }[] {
  return db.getAllSync<{ season: number; episode: number }>(
    'SELECT season, episode FROM watched_episodes WHERE tv_id = ?',
    [tvId]
  );
}

export interface InProgressShow {
  tvId: number;
  watched: number;
  lastWatchedAt: number;
}

/** Shows with at least one watched episode, most recently touched first. */
export function getInProgressShows(limit = 10): InProgressShow[] {
  return db.getAllSync<InProgressShow>(
    `SELECT tv_id AS tvId, COUNT(*) AS watched, MAX(watched_at) AS lastWatchedAt
     FROM watched_episodes
     GROUP BY tv_id
     ORDER BY lastWatchedAt DESC
     LIMIT ?`,
    [limit]
  );
}

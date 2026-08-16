import type { MediaType } from '@/lib/api/tmdb/types';
import { db } from '../client';

/**
 * How a bookmark got here. `flicks` is a right-swipe on the deck, which at a
 * realistic swipe rate arrives in bulk; `manual` is a deliberate save from a
 * detail screen. The Vault shows them apart so the second is not buried by the
 * first.
 */
export type BookmarkSource = 'manual' | 'flicks';

export interface BookmarkRow {
  media_type: MediaType;
  tmdb_id: number;
  created_at: number;
  synced: number;
  deleted: number;
  title: string | null;
  source: BookmarkSource;
}

/**
 * The library, held locally.
 *
 * SQLite is the source of truth for reads; Appwrite is a cross-device mirror
 * written on a debounce. Reading straight from Appwrite — which is what this
 * screen used to do — means the Vault is empty in airplane mode, on a cold
 * start before the network settles, and whenever the backend is unreachable
 * (a paused project, for instance).
 *
 * `synced = 0` is the outbox and `deleted = 1` is a tombstone: a removal has
 * to survive as a row until the delete has actually reached the server, or the
 * next reconcile reads the remote copy as a new addition and restores it.
 */

/** Live bookmarks, newest first. Tombstones are not bookmarks. */
export function listBookmarks(): BookmarkRow[] {
  return db.getAllSync<BookmarkRow>(
    `SELECT * FROM bookmarks WHERE deleted = 0 ORDER BY created_at DESC`
  );
}

export function isBookmarked(mediaType: MediaType, tmdbId: number): boolean {
  const row = db.getFirstSync<{ n: number }>(
    `SELECT 1 AS n FROM bookmarks
     WHERE media_type = ? AND tmdb_id = ? AND deleted = 0`,
    [mediaType, tmdbId]
  );
  return !!row;
}

/**
 * Adds, or revives a tombstone. Synchronous: the star must not wait on a round
 * trip, and it must stay lit if the request never lands.
 *
 * `source` is sticky at `manual`. A film the user deliberately saved and later
 * happened to right-swipe is still a deliberate save, and demoting it into the
 * bulk section would quietly lose that.
 */
export function addBookmarkLocal(
  mediaType: MediaType,
  tmdbId: number,
  title: string,
  source: BookmarkSource = 'manual'
): void {
  db.runSync(
    `INSERT INTO bookmarks (media_type, tmdb_id, created_at, synced, deleted, title, source)
     VALUES (?, ?, ?, 0, 0, ?, ?)
     ON CONFLICT(media_type, tmdb_id) DO UPDATE SET
       created_at = excluded.created_at,
       synced     = 0,
       deleted    = 0,
       title      = excluded.title,
       source     = CASE WHEN bookmarks.source = 'manual'
                         THEN 'manual' ELSE excluded.source END`,
    [mediaType, tmdbId, Date.now(), title, source]
  );
}

/** True when the deck has already auto-saved this title. */
export function isBookmarkedFromFlicks(
  mediaType: MediaType,
  tmdbId: number
): boolean {
  const row = db.getFirstSync<{ n: number }>(
    `SELECT 1 AS n FROM bookmarks
     WHERE media_type = ? AND tmdb_id = ? AND deleted = 0 AND source = 'flicks'`,
    [mediaType, tmdbId]
  );
  return !!row;
}

/** Clears every deck-saved bookmark, leaving hand-picked ones alone. */
export function clearFlicksBookmarks(): void {
  db.runSync(
    `UPDATE bookmarks SET deleted = 1, synced = 0
     WHERE source = 'flicks' AND deleted = 0`
  );
}

/** Tombstones rather than deletes, so the removal can still be pushed. */
export function removeBookmarkLocal(mediaType: MediaType, tmdbId: number): void {
  db.runSync(
    `UPDATE bookmarks SET deleted = 1, synced = 0
     WHERE media_type = ? AND tmdb_id = ?`,
    [mediaType, tmdbId]
  );
}

/** Rows whose state has not yet reached Appwrite — additions and removals. */
export function pendingBookmarks(): BookmarkRow[] {
  return db.getAllSync<BookmarkRow>(
    `SELECT * FROM bookmarks WHERE synced = 0 ORDER BY created_at ASC`
  );
}

export function markBookmarkSynced(mediaType: MediaType, tmdbId: number): void {
  // A pushed tombstone has done its job and can go for real.
  db.runSync(
    `DELETE FROM bookmarks
     WHERE media_type = ? AND tmdb_id = ? AND deleted = 1`,
    [mediaType, tmdbId]
  );
  db.runSync(
    `UPDATE bookmarks SET synced = 1 WHERE media_type = ? AND tmdb_id = ?`,
    [mediaType, tmdbId]
  );
}

/**
 * Folds a successful remote listing into the local table.
 *
 * Rules, in order of precedence:
 *   1. Anything still unsynced is a local edit the server has not seen — left
 *      strictly alone, so a reconcile can never clobber a pending change.
 *   2. A remote id with no local row was added on another device — inserted.
 *   3. A synced local row missing from the remote set was removed on another
 *      device — deleted.
 *
 * Runs in a transaction so a mid-loop failure cannot leave a half-merged set.
 */
export function reconcileBookmarks(
  remote: {
    mediaType: MediaType;
    tmdbId: number;
    createdAt: number;
    title?: string | null;
  }[]
): void {
  db.withTransactionSync(() => {
    const pending = new Set(
      db
        .getAllSync<BookmarkRow>(`SELECT * FROM bookmarks WHERE synced = 0`)
        .map((row) => `${row.media_type}:${row.tmdb_id}`)
    );

    const remoteKeys = new Set<string>();

    for (const item of remote) {
      const key = `${item.mediaType}:${item.tmdbId}`;
      remoteKeys.add(key);
      if (pending.has(key)) continue;

      // The Appwrite document carries no provenance, so a row arriving from
      // another device inserts as `manual` — the section a user will look in
      // for something they know they saved. An existing local row keeps its
      // own source: this device knows where it came from and the server does
      // not.
      db.runSync(
        `INSERT INTO bookmarks (media_type, tmdb_id, created_at, synced, deleted, title, source)
         VALUES (?, ?, ?, 1, 0, ?, 'manual')
         ON CONFLICT(media_type, tmdb_id) DO UPDATE SET
           created_at = excluded.created_at,
           synced     = 1,
           deleted    = 0,
           title      = COALESCE(excluded.title, bookmarks.title),
           source     = bookmarks.source`,
        [item.mediaType, item.tmdbId, item.createdAt, item.title ?? null]
      );
    }

    for (const row of db.getAllSync<BookmarkRow>(
      `SELECT * FROM bookmarks WHERE synced = 1`
    )) {
      const key = `${row.media_type}:${row.tmdb_id}`;
      if (remoteKeys.has(key)) continue;
      db.runSync(
        `DELETE FROM bookmarks WHERE media_type = ? AND tmdb_id = ?`,
        [row.media_type, row.tmdb_id]
      );
    }
  });
}

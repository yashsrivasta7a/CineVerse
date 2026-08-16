import { db } from '../client';

export type PrefFacet = 'country' | 'genre' | 'person';
export type PrefStance = 'like' | 'dislike' | 'block';

export interface PrefRow {
  facet: PrefFacet;
  value: string;
  stance: PrefStance;
  label: string | null;
  image_path: string | null;
  updated_at: number;
  synced: number;
}

export function readAllPrefs(): PrefRow[] {
  return db.getAllSync<PrefRow>('SELECT * FROM prefs');
}

/**
 * Upserts a stance. A given value holds exactly one stance at a time — liking
 * something you previously disliked replaces it rather than storing both.
 */
export function setStance(
  facet: PrefFacet,
  value: string,
  stance: PrefStance,
  label?: string | null,
  imagePath?: string | null
): void {
  db.runSync(
    `INSERT INTO prefs (facet, value, stance, label, image_path, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, 0)
     ON CONFLICT(facet, value) DO UPDATE SET
       stance     = excluded.stance,
       label      = COALESCE(excluded.label, prefs.label),
       image_path = COALESCE(excluded.image_path, prefs.image_path),
       updated_at = excluded.updated_at,
       synced     = 0`,
    [facet, value, stance, label ?? null, imagePath ?? null, Date.now()]
  );
}

export function clearStance(facet: PrefFacet, value: string): void {
  db.runSync('DELETE FROM prefs WHERE facet = ? AND value = ?', [facet, value]);
}

export function clearAllPrefs(): void {
  db.runSync('DELETE FROM prefs');
}

/* ------------------------------------------------------------------- kv */

export function getKv(key: string): string | null {
  const row = db.getFirstSync<{ value: string | null }>(
    'SELECT value FROM kv WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export function setKv(key: string, value: string | null): void {
  db.runSync(
    `INSERT INTO kv (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export const KV_ONBOARDING_COMPLETED_AT = 'onboarding.completedAt';
/** Index into MOOD_STOPS. Null/absent means "no mood set". */
export const KV_MOOD = 'mood.index';
export const KV_WATCH_REGION = 'watch.region';

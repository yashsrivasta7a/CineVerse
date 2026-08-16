import { ID } from 'react-native-appwrite';

import { env } from '@/lib/env';
import { appwriteDatabases, getAppwriteUserId } from './client';
import { ownerPermissions } from './session';

/**
 * Cross-device preference backup.
 *
 * SQLite stays the source of truth — the deck and the route gate read it on
 * hot paths and must never wait on a network call. Appwrite is the mirror, so
 * that a reinstall restores taste instead of re-running onboarding.
 *
 * The document id IS the Appwrite user id. That is deliberate: no query is
 * needed to find a user's row, and the per-document ACL attaches cleanly.
 */

export interface PrefsSnapshot {
  version: 1;
  updatedAt: number;
  onboardingCompletedAt: number | null;
  mood: number | null;
  /** `facet:value:stance:label` tuples, flattened for a simple string column. */
  entries: string[];
}

const DB = env.appwriteDatabaseId;
const COLLECTION = env.appwritePrefsCollectionId;

export async function pushPrefs(snapshot: PrefsSnapshot): Promise<boolean> {
  const userId = getAppwriteUserId();
  if (!userId) return false;

  const payload = {
    version: snapshot.version,
    updatedAt: snapshot.updatedAt,
    onboardingCompletedAt: snapshot.onboardingCompletedAt,
    mood: snapshot.mood,
    entries: JSON.stringify(snapshot.entries),
  };

  try {
    await appwriteDatabases.updateDocument(DB, COLLECTION, userId, payload);
    return true;
  } catch {
    // First write for this user — create it, ACL'd to them alone.
    try {
      await appwriteDatabases.createDocument(
        DB,
        COLLECTION,
        userId,
        payload,
        ownerPermissions(userId)
      );
      return true;
    } catch (error) {
      console.warn('[prefs] could not sync to Appwrite:', error);
      return false;
    }
  }
}

export async function pullPrefs(): Promise<PrefsSnapshot | null> {
  const userId = getAppwriteUserId();
  if (!userId) return null;

  try {
    const document = await appwriteDatabases.getDocument(DB, COLLECTION, userId);
    const raw = document as unknown as {
      version: number;
      updatedAt: number;
      onboardingCompletedAt: number | null;
      mood: number | null;
      entries: string;
    };

    return {
      version: 1,
      updatedAt: raw.updatedAt ?? 0,
      onboardingCompletedAt: raw.onboardingCompletedAt ?? null,
      mood: raw.mood ?? null,
      entries: JSON.parse(raw.entries || '[]') as string[],
    };
  } catch {
    // No remote document yet — a first-run device, not an error.
    return null;
  }
}

/** Kept for parity with ID.unique() imports elsewhere; not used directly. */
export const PREFS_DOCUMENT_ID_IS_USER_ID = ID;

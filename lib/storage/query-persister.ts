import Storage from 'expo-sqlite/kv-store';
import type {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client';

/**
 * Persists the TanStack Query cache to SQLite so a cold start renders from
 * disk instead of a spinner, and the app is usable with no network.
 *
 * `expo-sqlite/kv-store` is used rather than AsyncStorage because expo-sqlite
 * is already the app's local database (Phase 2 adds the relational tables for
 * preferences, swipe verdicts and bookmarks) — one storage engine, not two.
 */

const CACHE_KEY = 'rq-cache-v1';

export const queryPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await Storage.setItem(CACHE_KEY, JSON.stringify(client));
  },

  restoreClient: async () => {
    const raw = await Storage.getItem(CACHE_KEY);
    if (!raw) return undefined;

    try {
      return JSON.parse(raw) as PersistedClient;
    } catch {
      // A truncated or half-written blob would otherwise throw on every launch.
      await Storage.removeItem(CACHE_KEY);
      return undefined;
    }
  },

  removeClient: async () => {
    await Storage.removeItem(CACHE_KEY);
  },
};

/** Entries older than this are discarded on restore. */
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24h

/**
 * Bump to invalidate every persisted cache at once — do this whenever a
 * queryFn's return shape changes, or restored entries will be the old shape.
 */
export const CACHE_BUSTER = 'phase-1';

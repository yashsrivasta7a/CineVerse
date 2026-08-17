import { Account, Client, Databases, Functions } from 'react-native-appwrite';

import { env } from '@/lib/env';

/**
 * ponytail: `expo-doctor` reports a duplicate native module — expo-file-system
 * resolves to 18.1.11 here and 57.0.4 under expo. It is NOT fixable from this
 * repo: react-native-appwrite hard-pins `expo-file-system: 18.*.*` (still true
 * on 0.34.0, the latest), and its sdk.ts calls `readAsStringAsync`,
 * `writeAsStringAsync`, `EncodingType` and `cacheDirectory` — all of which moved
 * to `expo-file-system/legacy` in v54+. An `overrides` entry forcing v57 would
 * therefore hand the SDK four `undefined`s rather than deduplicate anything.
 *
 * Ceiling: harmless while this app touches no Appwrite Storage API — the only
 * surfaces used are Account, Databases and Functions, so that import is loaded
 * but never exercised. Android/iOS builds both bundle clean today.
 * Upgrade path: drop the override-free duplicate once the SDK moves to
 * expo-file-system v54+, or route file work through an Appwrite Function.
 */

export const appwriteClient = new Client()
  .setEndpoint(env.appwriteEndpoint)
  .setProject(env.appwriteProjectId);

export const appwriteAccount = new Account(appwriteClient);
export const appwriteDatabases = new Databases(appwriteClient);
export const appwriteFunctions = new Functions(appwriteClient);

/**
 * The signed-in Appwrite user id, once a session exists.
 *
 * Held here rather than in React state because the data helpers need it to
 * stamp per-document permissions, and they are called from places that are not
 * components (the swipe outbox, the preferences flush).
 *
 * `null` means no session — see the note in `session.ts` about what that
 * degrades to.
 */
let currentUserId: string | null = null;

export function setAppwriteUserId(userId: string | null): void {
  currentUserId = userId;
}

export function getAppwriteUserId(): string | null {
  return currentUserId;
}

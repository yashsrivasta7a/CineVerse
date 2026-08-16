import { Account, Client, Databases, Functions } from 'react-native-appwrite';

import { env } from '@/lib/env';

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

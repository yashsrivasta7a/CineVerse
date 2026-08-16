import { ID, Query } from 'react-native-appwrite';

import { env } from '@/lib/env';
import { appwriteDatabases, getAppwriteUserId } from './client';
import { ownerPermissions } from './session';
import type { BookmarkDocument } from './types';

const DB = env.appwriteDatabaseId;
const COLLECTION = env.appwriteBookmarksCollectionId;

export interface BookmarkSubject {
  id: number;
  title: string;
}

/**
 * Bookmarks.
 *
 * Every new document is stamped with per-user ACLs, which is what makes the
 * collection safe once Document Security is on. Before this, the collection had
 * to be world-writable for these calls to work at all — the `userId` filter
 * below was the *only* thing separating one user's rows from another's, and it
 * is client-supplied.
 *
 * `ownerPermissions` needs a live Appwrite session; without one the ACL array
 * is empty and the document falls back to collection-level rules. That is the
 * documented degraded mode, not silent breakage.
 */
function permissionsForCurrentUser(): string[] | undefined {
  const userId = getAppwriteUserId();
  return userId ? ownerPermissions(userId) : undefined;
}

export async function addBookmark(
  userId: string,
  movie: BookmarkSubject
): Promise<boolean> {
  try {
    await appwriteDatabases.createDocument(
      DB,
      COLLECTION,
      ID.unique(),
      {
        userId,
        movieId: movie.id,
        title: movie.title,
        bookmarkId: Date.now(),
        createdDate: new Date().toISOString(),
      },
      permissionsForCurrentUser()
    );
    return true;
  } catch (error) {
    console.error('[bookmarks] add failed:', error);
    return false;
  }
}

export async function removeBookmark(
  userId: string,
  movieId: number
): Promise<boolean> {
  try {
    const result = await appwriteDatabases.listDocuments(DB, COLLECTION, [
      Query.equal('userId', userId),
      Query.equal('movieId', movieId),
    ]);

    if (result.documents.length === 0) return false;

    await appwriteDatabases.deleteDocument(DB, COLLECTION, result.documents[0].$id);
    return true;
  } catch (error) {
    console.error('[bookmarks] remove failed:', error);
    return false;
  }
}

/**
 * THROWS on failure, deliberately.
 *
 * This used to catch and return `[]`, which is indistinguishable from "the
 * user has no bookmarks". Once the result feeds `reconcileBookmarks`, that
 * conflation is destructive: an unreachable backend — a paused project, a dead
 * network — would read as an empty server and delete the whole local library.
 * A rejected promise leaves the local rows untouched and lets React Query
 * surface the failure.
 */
export async function getBookmarks(userId: string): Promise<BookmarkDocument[]> {
  const result = await appwriteDatabases.listDocuments(DB, COLLECTION, [
    Query.equal('userId', userId),
    Query.orderDesc('createdDate'),
  ]);
  return result.documents as unknown as BookmarkDocument[];
}

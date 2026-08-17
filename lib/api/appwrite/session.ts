import { ExecutionMethod, Permission, Role } from 'react-native-appwrite';

import { env } from '@/lib/env';
import {
  appwriteAccount,
  appwriteFunctions,
  setAppwriteUserId,
} from './client';

/**
 * Appwrite authentication, bridged from Clerk.
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------
 * A collection in Appwrite is a shared table, not a per-user container.
 * Per-user privacy comes from document-level ACLs, and those only match when
 * the client holds an Appwrite *session*. The original code never created one —
 * it only called setEndpoint/setProject — so every request arrived as
 * `Role.guests()`, which forced the collections to grant `Role.any()` just to
 * function. The `userId` filter in each query was client-supplied, and the
 * project id ships in the bundle: anyone could list or delete anyone's rows.
 *
 * THE BRIDGE
 * ----------
 * Clerk owns identity. An Appwrite Function (`functions/clerk-session/`)
 * verifies a Clerk JWT server-side, finds-or-creates the matching Appwrite
 * user, and returns a one-shot token. The client exchanges that for a real
 * session, after which `Role.user(id)` ACLs apply.
 *
 * DEGRADATION
 * -----------
 * If the function is not deployed, this logs and returns null rather than
 * throwing. The app keeps working exactly as it did before — which is to say,
 * unauthenticated. That is deliberate: a half-configured backend should not
 * brick the client. `isAppwriteSessionActive()` reports the truth so callers
 * can decide.
 */

let established = false;

/**
 * Set once the backend has told us it cannot serve this app at all — the
 * project is paused, suspended, or the function is missing.
 *
 * `ensureAppwriteSession` is called on every sign-in check and on every focus,
 * so without this a paused Appwrite project printed the same warning on a loop
 * for the whole session. The condition is not transient and no amount of
 * retrying fixes it, so it is reported exactly once and then the bridge stays
 * quiet: the app is designed to run unauthenticated off local SQLite, and a
 * console full of a failure the user cannot act on hides the ones they can.
 */
let unavailable = false;

/** Backend states that will not resolve by trying again this run. */
function isPermanentlyUnavailable(error: unknown): boolean {
  const code = (error as { code?: number })?.code;
  const message = String((error as { message?: string })?.message ?? error);
  return (
    code === 404 ||
    code === 503 ||
    /paused|inactivity|suspend|not found|could not be found/i.test(message)
  );
}

export function isAppwriteSessionActive(): boolean {
  return established;
}

/** Per-document ACLs for a row owned by one user. */
export function ownerPermissions(userId: string): string[] {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ];
}

async function currentSessionUserId(): Promise<string | null> {
  try {
    const user = await appwriteAccount.get();
    return user.$id;
  } catch {
    return null;
  }
}

/**
 * Ensures an Appwrite session exists for the signed-in Clerk user.
 * Safe to call repeatedly; resolves immediately once a session is live.
 */
export async function ensureAppwriteSession(
  getClerkToken: () => Promise<string | null>
): Promise<string | null> {
  // Already known dead for this run. Silent by design — see `unavailable`.
  if (unavailable) return null;

  const existing = await currentSessionUserId();
  if (existing) {
    setAppwriteUserId(existing);
    established = true;
    return existing;
  }

  if (!env.appwriteSessionFunctionId) {
    unavailable = true;
    console.warn(
      '[appwrite] No session function configured ' +
        '(EXPO_PUBLIC_APPWRITE_SESSION_FUNCTION_ID). Running unauthenticated — ' +
        'per-document permissions will NOT apply. See functions/clerk-session/README.md'
    );
    return null;
  }

  try {
    const jwt = await getClerkToken();
    if (!jwt) return null;

    const execution = await appwriteFunctions.createExecution(
      env.appwriteSessionFunctionId,
      JSON.stringify({ jwt }),
      false,
      '/',
      ExecutionMethod.POST,
      { 'content-type': 'application/json' }
    );

    const payload = JSON.parse(execution.responseBody || '{}') as {
      userId?: string;
      secret?: string;
      error?: string;
    };

    if (payload.error || !payload.userId || !payload.secret) {
      unavailable = true;
      console.warn('[appwrite] Session function rejected the request:', payload.error);
      return null;
    }

    await appwriteAccount.createSession(payload.userId, payload.secret);
    setAppwriteUserId(payload.userId);
    established = true;
    return payload.userId;
  } catch (error) {
    // A paused or missing project is reported once and then never again; a
    // genuinely transient failure (offline, timeout) stays quiet and is simply
    // retried on the next call, because it may well succeed.
    if (isPermanentlyUnavailable(error)) {
      unavailable = true;
      console.warn(
        '[appwrite] Backend unavailable — running on local storage only. Sync is off for this session.',
        error
      );
    }
    return null;
  }
}

export async function clearAppwriteSession(): Promise<void> {
  try {
    await appwriteAccount.deleteSession('current');
  } catch {
    // No session to clear.
  } finally {
    setAppwriteUserId(null);
    established = false;
    // A fresh sign-in deserves a fresh attempt — the project may have been
    // resumed since the last one failed.
    unavailable = false;
  }
}

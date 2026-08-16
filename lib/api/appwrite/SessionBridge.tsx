import { useAuth } from '@clerk/clerk-expo';
import { useEffect } from 'react';

import { clearAppwriteSession, ensureAppwriteSession } from './session';

/**
 * Keeps the Appwrite session in step with Clerk.
 *
 * Renders nothing. Mounted once, high in the tree, so that by the time any
 * screen writes a document there is a session for its per-user ACLs to attach
 * to.
 *
 * Failure here is intentionally non-fatal — see `session.ts`. The app stays
 * usable with collection-level permissions if the bridging function has not
 * been deployed yet.
 */
export function AppwriteSessionBridge() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    let cancelled = false;

    if (!isSignedIn) {
      void clearAppwriteSession();
      return;
    }

    void ensureAppwriteSession(async () => {
      if (cancelled) return null;
      return getToken();
    });

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, getToken]);

  return null;
}

export default AppwriteSessionBridge;

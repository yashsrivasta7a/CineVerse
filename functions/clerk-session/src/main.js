import { verifyToken } from '@clerk/backend';
import { Client, ID, Users } from 'node-appwrite';

/**
 * Mints an Appwrite session token from a verified Clerk JWT.
 *
 * Clerk owns identity; Appwrite owns the data. Without this bridge the mobile
 * client has no Appwrite session, every request arrives as a guest, and the
 * collections have to be world-writable for anything to work at all.
 *
 * The Clerk secret key and the Appwrite API key MUST live here as function
 * environment variables — never in the app bundle, which is public.
 *
 * Required environment variables:
 *   CLERK_SECRET_KEY        sk_...       (Clerk dashboard -> API keys)
 *   APPWRITE_FUNCTION_PROJECT_ID          (injected by Appwrite)
 *   APPWRITE_FUNCTION_API_ENDPOINT        (injected by Appwrite)
 *   APPWRITE_API_KEY        server key with `users.read` + `users.write`
 */
export default async ({ req, res, log, error }) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {};
    const jwt = body.jwt;

    if (!jwt) {
      return res.json({ error: 'Missing jwt' }, 400);
    }

    // Verifies signature, issuer and expiry against Clerk. A forged or expired
    // token fails here, which is the whole point of doing this server-side.
    const claims = await verifyToken(jwt, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    const clerkUserId = claims.sub;
    if (!clerkUserId) {
      return res.json({ error: 'Token carried no subject' }, 401);
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const users = new Users(client);

    // The Clerk user id doubles as the Appwrite user id, so the mapping needs
    // no lookup table and stays stable across reinstalls.
    try {
      await users.get(clerkUserId);
    } catch {
      log(`Creating Appwrite user for Clerk id ${clerkUserId}`);
      await users.create(
        clerkUserId,
        claims.email ?? undefined,
        undefined,
        undefined,
        claims.name ?? undefined
      );
    }

    const token = await users.createToken(clerkUserId);

    return res.json({ userId: token.userId, secret: token.secret });
  } catch (err) {
    error(`clerk-session failed: ${err?.message ?? err}`);
    return res.json({ error: 'Could not mint a session' }, 401);
  }
};

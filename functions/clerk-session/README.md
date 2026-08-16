# clerk-session

Bridges Clerk identity into Appwrite so that per-document permissions actually
apply.

## Why this exists

A collection in Appwrite is a **shared table**, not a per-user container.
Per-user privacy comes from *document-level* ACLs, and those only match when the
client holds an Appwrite **session**.

Before this function, the app had none — it only called `setEndpoint` and
`setProject`. Every request therefore arrived as `Role.guests()`, which forced
the `bookmarks` collection to grant `Role.any()` just to work. The `userId`
filter in each query was supplied by the client, and the project id ships inside
the app bundle. **Anyone could list or delete anyone else's rows.**

This function closes that hole without moving off Clerk.

## Flow

```
app                     function                     appwrite
 |  Clerk JWT  ───────────>  verifyToken(jwt)
 |                           users.get(clerkId)
 |                             └ or users.create(...)
 |                           users.createToken(clerkId)
 |  <────── { userId, secret }
 |  account.createSession(userId, secret)  ─────────────>  session
```

The Clerk user id is reused verbatim as the Appwrite user id, so the mapping
needs no lookup table and survives reinstalls.

## Deploy

1. **Create the function** — Appwrite Console → Functions → Create.
   Runtime `Node 18+`, entrypoint `src/main.js`.

2. **Set environment variables** on the function:

   | Variable | Value |
   |---|---|
   | `CLERK_SECRET_KEY` | `sk_…` from the Clerk dashboard → API keys |
   | `APPWRITE_API_KEY` | a **server** API key with `users.read` and `users.write` |

   `APPWRITE_FUNCTION_PROJECT_ID` and `APPWRITE_FUNCTION_API_ENDPOINT` are
   injected by Appwrite automatically.

   > These two secrets must never appear in the app bundle. That is the entire
   > reason this runs server-side.

3. **Allow execution** — set the function's execute permission to `Any`
   (the JWT is what authenticates; an unverifiable token is rejected).

4. **Point the app at it** — add the function id to `.env`:

   ```
   EXPO_PUBLIC_APPWRITE_SESSION_FUNCTION_ID=<function id>
   ```

5. **Turn on Document Security** for `bookmarks`, `user_prefs` and `swipes`:

   - Collection settings → **Document Security: enabled**
   - Collection permissions: **`create` → Role: Users**, and nothing else.
     No `read`, `update` or `delete` at the collection level — those come from
     each document's own ACL.

   The client stamps every new document with
   `[read/update/delete → Role.user(<id>)]` (see `ownerPermissions()` in
   `lib/api/appwrite/session.ts`).

## Order matters

Do step 5 **before** the `swipes` collection has any rows. Retrofitting
per-document ACLs onto a world-writable collection that is already full of data
is strictly harder than starting with them.

## If it isn't deployed

The client degrades rather than crashing: `ensureAppwriteSession()` logs a
warning and returns `null`, and the app behaves exactly as it did before —
unauthenticated, with collection-level permissions. `isAppwriteSessionActive()`
reports the real state.

## Verifying the fix

Signed in as user A, call the Appwrite REST endpoint directly with user B's id
in the query. Before: it returns B's rows. After: 401 or an empty set.

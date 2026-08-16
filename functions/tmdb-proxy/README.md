# tmdb-proxy

Removes the TMDB token from the app bundle.

## Is this necessary?

Be honest about the severity. An `EXPO_PUBLIC_` TMDB **read** token is low risk:
read-only, free, rate limited per IP, and revocable in one click. It is not a
payment credential.

But it **is** extractable from any shipped build, and public tokens do get
scraped and abused. This is the only thing that actually removes it.

One thing that does **not** help: moving the token into `app.config.ts` →
`extra`. That is still the bundle. Only a server-side hop removes it.

## Deploy

1. Appwrite Console → Functions → Create. Runtime Node 18+, entrypoint
   `src/main.js`.
2. Set the function environment variable:

   | Variable | Value |
   |---|---|
   | `TMDB_READ_TOKEN` | your v4 read access token |

3. Execute permission: `Any`.
4. Point the app at the function's URL:

   ```
   EXPO_PUBLIC_TMDB_PROXY_URL=https://<region>.appwrite.run/v1/functions/<id>/executions
   ```

5. **Remove `EXPO_PUBLIC_MOVIE_API_KEY` from `.env`** and rotate the old token —
   it is in every build you have already made.

`lib/api/tmdb/client.ts` switches automatically: when the proxy URL is set it
drops the `Authorization` header and routes everything through the proxy. No
other file changes.

## The allowlist matters

`ALLOWED` in `src/main.js` restricts which TMDB paths are forwarded. Without it
this is an **open proxy** — anyone who finds the URL can use your token for any
TMDB endpoint, including writes.

If you add a feature that calls a new TMDB path, add its pattern here too, or
the call returns 403.

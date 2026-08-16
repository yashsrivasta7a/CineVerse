/**
 * Forwards allowlisted TMDB read requests with the token injected server-side.
 *
 * With this deployed and EXPO_PUBLIC_TMDB_PROXY_URL pointed at it, no TMDB
 * credential exists anywhere in the app bundle.
 *
 * Environment variable (function-scoped, never in the app):
 *   TMDB_READ_TOKEN   the v4 read access token
 */

/**
 * Only these path shapes are forwarded. An open proxy would let anyone use
 * your token for anything TMDB offers, including write endpoints.
 */
const ALLOWED = [
  /^\/movie\/\d+$/,
  /^\/movie\/(popular|upcoming|top_rated|now_playing)$/,
  /^\/tv\/\d+$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/person\/(popular|\d+)$/,
  /^\/discover\/(movie|tv)$/,
  /^\/search\/(movie|tv|multi|person|keyword)$/,
  /^\/trending\/(all|movie|tv)\/(day|week)$/,
  /^\/genre\/(movie|tv)\/list$/,
  /^\/configuration\/countries$/,
  /^\/watch\/providers\/(movie|tv)$/,
];

export default async ({ req, res, error }) => {
  try {
    const path = req.path === '/' ? req.query?.path : req.path;

    if (!path || !ALLOWED.some((pattern) => pattern.test(path))) {
      return res.json({ error: 'Path not allowed' }, 403);
    }

    const params = new URLSearchParams(req.query ?? {});
    params.delete('path');

    const url = `https://api.themoviedb.org/3${path}${
      params.toString() ? `?${params.toString()}` : ''
    }`;

    const upstream = await fetch(url, {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${process.env.TMDB_READ_TOKEN}`,
      },
    });

    const body = await upstream.text();
    return res.text(body, upstream.status, {
      'content-type': 'application/json',
      // TMDB reference data barely changes; let the edge hold it.
      'cache-control': 'public, max-age=300',
    });
  } catch (err) {
    error(`tmdb-proxy failed: ${err?.message ?? err}`);
    return res.json({ error: 'Upstream request failed' }, 502);
  }
};

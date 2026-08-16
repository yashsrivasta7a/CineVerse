import { env } from '@/lib/env';
import { requestJson } from '@/lib/http';

/**
 * Single entry point for every TMDB call.
 *
 * Auth is the v4 read token as a Bearer header, and *only* that. The original
 * implementation also appended `?api_key=<v4 token>` — a parameter that expects
 * a v3 key, so it was both wrong and a way to leak the token into URL and proxy
 * logs.
 *
 * PROXY MODE
 * ----------
 * When `EXPO_PUBLIC_TMDB_PROXY_URL` is set, requests go there instead and no
 * TMDB token ships in the bundle at all. Be honest about the severity of not
 * doing this: an `EXPO_PUBLIC_` TMDB *read* token is low risk — read-only,
 * free, per-IP rate limited, revocable — but it IS extractable from any build
 * and will eventually be scraped. Moving it into `app.config.ts` -> `extra`
 * would NOT help; that is still the bundle. Only a server-side proxy removes
 * it. See functions/tmdb-proxy/README.md.
 */
const TMDB_DIRECT_URL = 'https://api.themoviedb.org/3';

export const TMDB_BASE_URL = env.tmdbProxyUrl || TMDB_DIRECT_URL;

/** True when the token is being kept server-side. */
export const usingProxy = !!env.tmdbProxyUrl;

const HEADERS: Record<string, string> = usingProxy
  ? { accept: 'application/json' }
  : {
      accept: 'application/json',
      Authorization: `Bearer ${env.tmdbReadToken}`,
    };

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;

export function buildUrl(path: string, params: QueryParams = {}): string {
  const search = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    )
    .join('&');

  return `${TMDB_BASE_URL}${path}${search ? `?${search}` : ''}`;
}

export function tmdbGet<T>(
  path: string,
  params: QueryParams = {},
  signal?: AbortSignal
): Promise<T> {
  return requestJson<T>(buildUrl(path, params), { headers: HEADERS, signal });
}

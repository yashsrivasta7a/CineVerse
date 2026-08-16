import type { TmdbProvider, TmdbWatchProviders } from './types';

/**
 * Default watch region.
 *
 * The previous Watchmode integration hardcoded 'IN' with no way to change it;
 * this at least names the assumption in one place. The profile settings screen
 * makes it a real preference.
 */
export const DEFAULT_WATCH_REGION = 'IN';

export type ProviderKind = 'flatrate' | 'free' | 'ads' | 'rent' | 'buy';

export interface ResolvedProvider extends TmdbProvider {
  kind: ProviderKind;
}

export interface ResolvedProviders {
  providers: ResolvedProvider[];
  /** JustWatch attribution link for the region — required by TMDB's terms. */
  link: string | null;
}

/** Streaming first: what a subscriber can watch now beats what they can rent. */
const KIND_ORDER: ProviderKind[] = ['flatrate', 'free', 'ads', 'rent', 'buy'];

export function resolveProviders(
  block: TmdbWatchProviders | undefined,
  region: string = DEFAULT_WATCH_REGION
): ResolvedProviders {
  const forRegion = block?.results?.[region];
  if (!forRegion) return { providers: [], link: null };

  const seen = new Set<number>();
  const providers: ResolvedProvider[] = [];

  for (const kind of KIND_ORDER) {
    for (const provider of forRegion[kind] ?? []) {
      // A service often appears under several kinds; keep the best one.
      if (seen.has(provider.provider_id)) continue;
      seen.add(provider.provider_id);
      providers.push({ ...provider, kind });
    }
  }

  providers.sort((a, b) => a.display_priority - b.display_priority);

  return { providers, link: forRegion.link ?? null };
}

export const PROVIDER_KIND_LABEL: Record<ProviderKind, string> = {
  flatrate: 'Stream',
  free: 'Free',
  ads: 'With ads',
  rent: 'Rent',
  buy: 'Buy',
};

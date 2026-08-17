import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { FilmStrip } from '@/components/kino/FilmStrip';
import { PosterCard } from '@/components/media/PosterCard';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { discoverMoviesPage } from '@/lib/api/tmdb/discover';
import { normalizeMovie } from '@/lib/api/tmdb/normalize';
import { useGridWidth } from '@/lib/hooks/useGridWidth';
import { qk } from '@/lib/queries/keys';
import { applyTaste, tasteFromPrefs } from '@/lib/recommend/params';
import { buildVector } from '@/lib/recommend/taste';
import { wildcardParams } from '@/lib/recommend/pool';
import { getTasteSignals } from '@/db/queries/verdicts';
import { genreRail, moodRail, personRail, wildcardRail } from '@/lib/recommend/presets';
import { paramsFromFilters, useFilters } from '@/lib/store/filters';
import { selectByFacet, usePrefs } from '@/lib/store/prefs';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

/**
 * One paginated grid, for every "see all".
 *
 * The slug resolves back to a discover preset, so a new collection screen never
 * needs new code — the rail and the full grid read from the same descriptor.
 * This is also the app's first properly paginated list; nothing before it went
 * past page one.
 */
export default function CollectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const entries = usePrefs((state) => state.entries);
  const { itemWidth, gutter } = useGridWidth(2);

  const filters = useFilters();

  // Taste rails are generated, not listed in PRESETS, so rebuild them from the
  // stored preference that produced them.
  const preset = useMemo(() => {
    // The filters sheet routes here with a reserved slug rather than encoding
    // its whole state into the URL. It is the one collection that must NOT pick
    // up the stored taste — an explicit filter is the user overriding their
    // standing preferences for one search, and quietly re-applying them would
    // return fewer results than the sheet just promised.
    if (slug === 'filtered') {
      return {
        slug: 'filtered',
        title: 'Filtered',
        subtitle: 'Matching your filters',
        params: paramsFromFilters(filters),
      };
    }

    const resolved = (() => {
      // Rebuilt from the same vector the deck reads, so "see all" on the
      // exploration rail shows the grid the rail was actually cut from.
      if (slug === 'off-usual') {
        return wildcardRail(wildcardParams(buildVector(getTasteSignals('movie'))));
      }

      const moodMatch = /^mood-(\d+)$/.exec(slug ?? '');
      if (moodMatch) return moodRail(Number(moodMatch[1]));

      const genreMatch = /^genre-(\d+)$/.exec(slug ?? '');
      if (genreMatch) {
        const entry = selectByFacet(entries, 'genre', 'like').find(
          (candidate) => candidate.value === genreMatch[1]
        );
        return genreRail(Number(genreMatch[1]), entry?.label ?? 'Genre');
      }

      const personMatch = /^person-(\d+)$/.exec(slug ?? '');
      if (personMatch) {
        const entry = selectByFacet(entries, 'person', 'like').find(
          (candidate) => candidate.value === personMatch[1]
        );
        return personRail(Number(personMatch[1]), entry?.label ?? 'Cast');
      }

      return null;
    })();

    if (!resolved) return null;

    // The same taste the rail was built with. Without this, "see all" on a
    // filtered rail opens a grid holding the very titles the rail excluded.
    return { ...resolved, params: applyTaste(resolved.params, tasteFromPrefs(entries)) };
  }, [slug, entries, filters]);

  const query = useInfiniteQuery({
    queryKey: qk.discover('movie', { ...(preset?.params ?? {}), paged: 1 }),
    queryFn: ({ pageParam, signal }) =>
      discoverMoviesPage({ ...(preset?.params ?? {}), page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.total_pages ? last.page + 1 : undefined,
    enabled: !!preset,
    staleTime: 1000 * 60 * 15,
  });

  const titles = useMemo(() => {
    const seen = new Set<number>();
    const out = [];
    for (const page of query.data?.pages ?? []) {
      for (const raw of page.results) {
        if (seen.has(raw.id)) continue;
        seen.add(raw.id);
        out.push(normalizeMovie(raw));
      }
    }
    return out;
  }, [query.data]);

  return (
    <Screen>
      <View style={{ paddingHorizontal: grid.screenPadding, paddingTop: 6, gap: 10 }}>
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{
            width: 40,
            height: 40,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.inkRaised,
            borderWidth: 2,
            borderColor: colors.noir,
          }}
        >
          <Ionicons name="arrow-back" size={19} color={colors.paper} />
        </PressableScale>

        <Display variant="display" numberOfLines={2}>
          {preset?.title ?? 'Not found'}
        </Display>

        {preset?.subtitle ? (
          <Text variant="bodySm" color={withAlpha(colors.paper, 0.6)}>
            {preset.subtitle}
          </Text>
        ) : null}

        <FilmStrip height={10} pitch={16} style={{ marginTop: 4 }} />
      </View>

      {!preset ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="body" color={withAlpha(colors.paper, 0.7)}>
            That collection doesn&apos;t exist.
          </Text>
        </View>
      ) : query.isPending ? (
        <ActivityIndicator size="large" color={colors.blood} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={titles}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: gutter, paddingHorizontal: grid.screenPadding }}
          contentContainerStyle={{ paddingTop: 18, paddingBottom: 140, rowGap: 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PosterCard title={item} style={{ width: itemWidth }} />
          )}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) {
              void query.fetchNextPage();
            }
          }}
          ListFooterComponent={
            query.isFetchingNextPage ? (
              <ActivityIndicator color={colors.blood} style={{ marginTop: 20 }} />
            ) : null
          }
        />
      )}
    </Screen>
  );
}

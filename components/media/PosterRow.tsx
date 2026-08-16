import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { PosterCard } from '@/components/media/PosterCard';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { Display } from '@/components/ui/Display';
import { discoverMoviesPage } from '@/lib/api/tmdb/discover';
import { normalizeMovie } from '@/lib/api/tmdb/normalize';
import { qk } from '@/lib/queries/keys';
import type { CollectionPreset } from '@/lib/recommend/presets';
import { colors, grid, withAlpha } from '@/theme/tokens';

export interface PosterRowProps {
  preset: CollectionPreset;
  onSeeAll?: (preset: CollectionPreset) => void;
  cardWidth?: number;
}

/**
 * One horizontal rail, driven entirely by a preset.
 *
 * Each rail owns its own query, so a slow or failing rail degrades on its own
 * instead of blanking the whole home screen — which is how the original single
 * combined loading gate behaved.
 */
export function PosterRow({ preset, onSeeAll, cardWidth = 124 }: PosterRowProps) {
  const { data, isPending, isError } = useQuery({
    queryKey: qk.discover('movie', preset.params),
    queryFn: ({ signal }) => discoverMoviesPage(preset.params, signal),
    select: (page) => page.results.map(normalizeMovie).slice(0, 12),
    staleTime: 1000 * 60 * 15,
  });

  // A rail with nothing in it is noise — drop it rather than showing an
  // empty heading.
  if (isError || (!isPending && !data?.length)) return null;

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          paddingHorizontal: grid.screenPadding,
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Display variant="displaySm" numberOfLines={1}>
            {preset.title}
          </Display>
          {preset.subtitle ? (
            <Text variant="osd" color={withAlpha(colors.paper, 0.5)} style={{ marginTop: 3 }}>
              {preset.subtitle}
            </Text>
          ) : null}
        </View>

        {onSeeAll ? (
          <PressableScale
            onPress={() => onSeeAll(preset)}
            scaleTo={0.96}
            accessibilityRole="link"
            accessibilityLabel={`See all ${preset.title}`}
            style={{ paddingVertical: 4, paddingLeft: 8 }}
          >
            <Text variant="osd" color={colors.blood}>See all</Text>
          </PressableScale>
        ) : null}
      </View>

      {isPending ? (
        <ActivityIndicator color={colors.blood} style={{ height: cardWidth * 1.5 }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: grid.screenPadding, gap: 12 }}
        >
          {data?.map((title) => (
            <PosterCard key={title.id} title={title} style={{ width: cardWidth }} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

export default PosterRow;

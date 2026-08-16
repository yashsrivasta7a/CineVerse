import { useQuery } from '@tanstack/react-query';
import { ScrollView, View } from 'react-native';

import { PosterCard } from '@/components/media/PosterCard';
import { PosterSkeleton } from '@/components/media/PosterSkeleton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { discoverMoviesPage } from '@/lib/api/tmdb/discover';
import { normalizeMovie } from '@/lib/api/tmdb/normalize';
import { qk } from '@/lib/queries/keys';
import type { CollectionPreset } from '@/lib/recommend/presets';
import { colors, grid } from '@/theme/tokens';

/** Enough to reach the right edge on the widest phone, and no more. */
const SKELETON_KEYS = ['a', 'b', 'c', 'd'];

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
          {/* Deliberately `Text`, not `Display`. The offset shadow is the
              heaviest device in the type system and only reads as emphasis
              while it stays rare — the masthead and the premiere own it. On
              five rails down a scroll it stopped being emphasis and became
              texture. */}
          <Text variant="displaySm" numberOfLines={1}>
            {preset.title}
          </Text>
          {/* Muted, not full ivory. The subtitle qualifies the heading above
              it; painted in the same tone at the same strength it competed with
              it instead, and a 28pt heading over a 10pt line of identical
              colour reads as two headings. */}
          {preset.subtitle ? (
            <Text variant="osd" color={colors.paperMuted} style={{ marginTop: 3 }}>
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
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{ paddingVertical: 4, paddingLeft: 8 }}
          >
            {/* Ivory, not blood. Blood on ink measures 2.9:1 — below AA at any
                size — and this line repeats once per rail, so it was the page's
                most-repeated unreadable element. The affordance is carried by
                position and tracking instead: it sits alone at the rail's right
                edge, where nothing else on the page does. */}
            <Text variant="label" color={colors.paper}>See all</Text>
          </PressableScale>
        ) : null}
      </View>

      <ScrollView
        horizontal
        scrollEnabled={!isPending}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: grid.screenPadding, gap: 12 }}
      >
        {isPending
          ? SKELETON_KEYS.map((key) => <PosterSkeleton key={key} width={cardWidth} />)
          : data?.map((title) => (
              <PosterCard key={title.id} title={title} style={{ width: cardWidth }} />
            ))}
      </ScrollView>
    </View>
  );
}

export default PosterRow;

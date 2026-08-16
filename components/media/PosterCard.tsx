import React, { memo } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';

import { Text } from '@/components/ui/Text';
import { RatingStars } from '@/components/kino/RatingStars';
import { posterUrlOrPlaceholder } from '@/lib/api/tmdb/images';
import type { Title } from '@/lib/api/tmdb/types';
import { colors, radius, withAlpha } from '@/theme/tokens';

export interface PosterCardProps {
  title: Title;
  /** Rank badge for trending rails. */
  rank?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The single poster card.
 *
 * Replaces MovieCard and TrendingCard, and with `useGridWidth` replaces the
 * three different grid systems (48% flex-wrap, FlatList numColumns, 32%
 * flex-wrap) that previously rendered the same content at three sizes.
 */
function PosterCardBase({ title, rank, style }: PosterCardProps) {
  const year = title.date ? title.date.slice(0, 4) : null;
  const href =
    title.mediaType === 'tv' ? `/tv/${title.id}` : `/movies/${title.id}`;

  return (
    <Link href={href as never} asChild>
      <Pressable
        style={style}
        accessibilityRole="link"
        accessibilityLabel={`${title.title}${year ? `, ${year}` : ''}`}
      >
        <View
          style={{
            backgroundColor: colors.paper,
            padding: 5,
            borderRadius: radius.sm,
          }}
        >
          <Image
            source={{ uri: posterUrlOrPlaceholder(title.posterPath, 'w342') }}
            style={{ width: '100%', aspectRatio: 2 / 3, borderRadius: 2 }}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
          />

          {rank !== undefined ? (
            <View
              style={{
                position: 'absolute',
                top: -6,
                left: -6,
                backgroundColor: colors.blood,
                borderWidth: 2,
                borderColor: colors.noir,
                borderRadius: radius.sm,
                paddingHorizontal: 7,
                paddingVertical: 1,
              }}
            >
              <Text variant="label" color={colors.paper}>
                {String(rank).padStart(2, '0')}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 7, gap: 3 }}>
          <Text variant="heading" numberOfLines={1}>
            {title.title}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {title.voteAverage > 0 ? (
              <RatingStars value={title.voteAverage} size={10} />
            ) : null}
            {year ? (
              <Text variant="osd" color={withAlpha(colors.paper, 0.55)}>
                {year}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

/**
 * Memoized: this renders 20-40 times per rail and several rails per screen, and
 * its props are stable identities from a query cache. Without this, every
 * parent state change (a mood tap, a scroll-driven re-render) re-renders every
 * poster on the page.
 */
export const PosterCard = memo(PosterCardBase);

export default PosterCard;

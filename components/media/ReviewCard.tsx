import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { RatingStars } from '@/components/decor/RatingStars';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { profileUrl } from '@/lib/api/tmdb/images';
import type { TmdbReview } from '@/lib/api/tmdb/types';
import { colors, radius, withAlpha } from '@/theme/tokens';

export interface ReviewCardProps {
  review: TmdbReview;
  width: number;
}

const formatDate = (iso: string) => {
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, '0')}.${String(
    date.getMonth() + 1
  ).padStart(2, '0')}.${date.getFullYear()}`;
};

/**
 * "Notes from readers" — a real TMDB review.
 *
 * These are genuine audience reviews from the detail request's
 * `append_to_response`, so they cost nothing extra and are attributable to a
 * real author. The masterplan's "reviews from bloggers" section is served by
 * the videos row instead, honestly labelled, rather than by inventing bloggers.
 */
export function ReviewCard({ review, width }: ReviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const avatar = profileUrl(review.author_details.avatar_path, 'w185');
  const rating = review.author_details.rating;

  return (
    <View
      style={{
        width,
        backgroundColor: colors.inkRaised,
        borderRadius: radius.md,
        borderWidth: 2,
        borderColor: colors.noir,
        padding: 14,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            overflow: 'hidden',
            backgroundColor: colors.blood,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Text variant="heading" color={colors.paper}>
              {review.author.slice(0, 1).toUpperCase()}
            </Text>
          )}
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="heading" numberOfLines={1}>
            {review.author}
          </Text>
          {rating !== null ? <RatingStars value={rating} size={11} /> : null}
        </View>
      </View>

      <Text
        variant="bodySm"
        color={withAlpha(colors.paper, 0.8)}
        numberOfLines={expanded ? undefined : 5}
      >
        {review.content.trim()}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {review.content.length > 220 ? (
          <PressableScale
            onPress={() => setExpanded((previous) => !previous)}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Show less' : 'Read the full review'}
            style={{ paddingVertical: 2 }}
          >
            <Text variant="osd" color={colors.blood}>
              {expanded ? 'Less' : 'Read more'}
            </Text>
          </PressableScale>
        ) : (
          <View />
        )}

        <Text variant="osd" color={withAlpha(colors.paper, 0.4)}>
          {formatDate(review.created_at)}
        </Text>
      </View>
    </View>
  );
}

export default ReviewCard;

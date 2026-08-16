import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';

import { Text } from '@/components/ui/Text';
import { backdropUrlOrPlaceholder } from '@/lib/api/tmdb/images';
import type { Title } from '@/lib/api/tmdb/types';
import { colors, radius, withAlpha } from '@/theme/tokens';

export interface ProgressPosterProps {
  title: Title;
  /**
   * 0-1. Omit entirely when there is nothing real to show — a bar the app
   * cannot actually measure is a fabricated number, and Phase 7 wires this to
   * genuine watched-episode counts.
   */
  progress?: number;
  width: number;
  style?: StyleProp<ViewStyle>;
}

/** Landscape still with a progress bar — the Continue Watching rail. */
export function ProgressPoster({ title, progress, width, style }: ProgressPosterProps) {
  const href = title.mediaType === 'tv' ? `/tv/${title.id}` : `/movies/${title.id}`;
  const clamped =
    progress === undefined ? undefined : Math.max(0, Math.min(1, progress));

  return (
    <Link href={href as never} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={
          clamped === undefined
            ? title.title
            : `${title.title}, ${Math.round(clamped * 100)} percent watched`
        }
        style={[{ width }, style]}
      >
        <View
          style={{
            width,
            aspectRatio: 16 / 10,
            borderRadius: radius.md,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: colors.noir,
          }}
        >
          <Image
            source={{
              uri: backdropUrlOrPlaceholder(
                title.backdropPath ?? title.posterPath,
                'w780'
              ),
            }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={180}
            cachePolicy="memory-disk"
          />

          {clamped !== undefined ? (
            <View
              style={{
                position: 'absolute',
                left: 6,
                right: 6,
                bottom: 6,
                height: 4,
                borderRadius: 2,
                backgroundColor: withAlpha(colors.noir, 0.55),
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${clamped * 100}%`,
                  height: '100%',
                  backgroundColor: colors.blood,
                }}
              />
            </View>
          ) : null}
        </View>

        <Text variant="chip" numberOfLines={1} style={{ marginTop: 6 }}>
          {title.title}
        </Text>
      </Pressable>
    </Link>
  );
}

export default ProgressPoster;

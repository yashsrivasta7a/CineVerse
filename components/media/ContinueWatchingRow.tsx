import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { backdropUrlOrPlaceholder } from '@/lib/api/tmdb/images';
import { useContinueWatching } from '@/lib/queries/tv';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

/**
 * Continue Watching.
 *
 * The progress bar is `watched / total episodes` — both real numbers. The app
 * has no playback, so the only honest way to show progress is to have the user
 * mark episodes on the season screen; a percentage invented from nothing would
 * be a fabrication dressed as data.
 *
 * The rail therefore hides itself entirely until a first episode is marked,
 * rather than sitting there empty.
 */
export function ContinueWatchingRow() {
  const router = useRouter();
  const shows = useContinueWatching();

  if (!shows.length) return null;

  return (
    <View style={{ gap: 12 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: grid.screenPadding, gap: 12 }}
      >
        {shows.map((show) => (
          <PressableScale
            key={show.tvId}
            onPress={() => router.push(`/tv/${show.tvId}` as never)}
            accessibilityRole="link"
            accessibilityLabel={`${show.name}, ${show.watched} of ${show.total} episodes watched`}
            style={{ width: 212, gap: 8 }}
          >
            <View
              style={{
                width: 212,
                aspectRatio: 16 / 10,
                borderRadius: radius.md,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: colors.noir,
                backgroundColor: colors.inkRaised,
              }}
            >
              <Image
                source={{
                  uri: backdropUrlOrPlaceholder(
                    show.backdropPath ?? show.posterPath,
                    'w780'
                  ),
                }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={180}
                cachePolicy="memory-disk"
              />

              <View
                style={{
                  position: 'absolute',
                  left: 8,
                  right: 8,
                  bottom: 8,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: withAlpha(colors.noir, 0.6),
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${show.progress * 100}%`,
                    height: '100%',
                    backgroundColor: colors.blood,
                  }}
                />
              </View>
            </View>

            <View style={{ gap: 2 }}>
              <Text variant="chip" numberOfLines={1}>{show.name}</Text>
              <Text variant="osd" color={withAlpha(colors.paper, 0.45)}>
                {show.watched} / {show.total} episodes
              </Text>
            </View>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

export default ContinueWatchingRow;

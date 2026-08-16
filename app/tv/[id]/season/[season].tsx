import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, View } from 'react-native';

import { FilmStrip } from '@/components/kino/FilmStrip';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { stillUrl } from '@/lib/api/tmdb/images';
import type { TmdbEpisode } from '@/lib/api/tmdb/types';
import { useSeason, useWatchedEpisodes } from '@/lib/queries/tv';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

const airDate = (iso: string | null) => {
  if (!iso) return null;
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, '0')}.${String(
    date.getMonth() + 1
  ).padStart(2, '0')}.${date.getFullYear()}`;
};

export default function SeasonScreen() {
  const { id, season } = useLocalSearchParams<{ id: string; season: string }>();
  const router = useRouter();

  const tvId = Number(id);
  const seasonNumber = Number(season);

  const { data, isPending, error } = useSeason(id, seasonNumber);
  const { isWatched, toggle } = useWatchedEpisodes(tvId);

  const renderEpisode = ({ item }: { item: TmdbEpisode }) => {
    const watched = isWatched(item.season_number, item.episode_number);
    const still = stillUrl(item.still_path, 'w300');

    return (
      <View
        style={{
          flexDirection: 'row',
          gap: 12,
          backgroundColor: colors.inkRaised,
          borderRadius: radius.md,
          borderWidth: 2,
          borderColor: colors.noir,
          overflow: 'hidden',
          opacity: watched ? 0.72 : 1,
        }}
      >
        <View style={{ width: 116, backgroundColor: colors.inkDeep }}>
          {still ? (
            <Image
              source={{ uri: still }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={160}
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="tv-outline" size={22} color={withAlpha(colors.paper, 0.4)} />
            </View>
          )}

          <View
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              backgroundColor: colors.blood,
              borderRadius: radius.sm,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <Text variant="osd" color={colors.paper}>E{item.episode_number}</Text>
          </View>
        </View>

        <View style={{ flex: 1, paddingVertical: 12, paddingRight: 12, gap: 6 }}>
          <Text variant="heading" numberOfLines={2}>{item.name}</Text>

          {item.overview ? (
            <Text variant="bodySm" color={withAlpha(colors.paper, 0.6)} numberOfLines={3}>
              {item.overview}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <Text variant="osd" color={withAlpha(colors.paper, 0.4)}>
              {[airDate(item.air_date), item.runtime ? `${item.runtime}min` : null]
                .filter(Boolean)
                .join('  ·  ')}
            </Text>

            <PressableScale
              onPress={() => {
                Haptics.impactAsync(
                  watched
                    ? Haptics.ImpactFeedbackStyle.Light
                    : Haptics.ImpactFeedbackStyle.Medium
                );
                toggle(item.season_number, item.episode_number);
              }}
              scaleTo={0.92}
              accessibilityRole="button"
              accessibilityLabel={
                watched
                  ? `Mark episode ${item.episode_number} unwatched`
                  : `Mark episode ${item.episode_number} watched`
              }
              accessibilityState={{ checked: watched }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: watched ? colors.paper : 'transparent',
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: watched ? colors.paper : withAlpha(colors.paper, 0.4),
                paddingHorizontal: 11,
                paddingVertical: 6,
              }}
            >
              <Ionicons
                name={watched ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={watched ? colors.ink : withAlpha(colors.paper, 0.7)}
              />
              <Text
                variant="osd"
                color={watched ? colors.ink : withAlpha(colors.paper, 0.7)}
              >
                {watched ? 'Watched' : 'Mark'}
              </Text>
            </PressableScale>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Screen osd={{ left: 'SERIES', right: 'EPISODES' }}>
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
          {data?.name ?? `Season ${seasonNumber}`}
        </Display>

        {data?.overview ? (
          <Text variant="bodySm" color={withAlpha(colors.paper, 0.6)} numberOfLines={3}>
            {data.overview}
          </Text>
        ) : null}

        <FilmStrip height={10} pitch={16} style={{ marginTop: 2 }} />
      </View>

      {isPending ? (
        <ActivityIndicator size="large" color={colors.blood} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text
          variant="body"
          color={colors.blood}
          style={{ textAlign: 'center', marginTop: 30 }}
        >
          Couldn&apos;t load this season.
        </Text>
      ) : (
        <FlatList
          data={data?.episodes ?? []}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEpisode}
          contentContainerStyle={{
            paddingHorizontal: grid.screenPadding,
            paddingTop: 18,
            paddingBottom: 40,
            gap: 12,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Screen>
  );
}

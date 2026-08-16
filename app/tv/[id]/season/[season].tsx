import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { FilmStrip } from '@/components/kino/FilmStrip';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { stillUrl } from '@/lib/api/tmdb/images';
import type { TmdbEpisode } from '@/lib/api/tmdb/types';
import { airDate, runtimeLabel } from '@/lib/format/airDate';
import { useSeason, useWatchedEpisodes } from '@/lib/queries/tv';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

/** Width of the tick column. Comfortably past the 44pt touch minimum. */
const TICK_WIDTH = 56;
const STILL_WIDTH = 112;

const pad = (value: number) => String(value).padStart(2, '0');

/**
 * The season at a glance: one block per episode, filled once you have seen it.
 *
 * A percentage would have been less work and told you less. The block strip
 * shows *where* the gaps are — a season you abandoned halfway reads completely
 * differently from one you have watched out of order, and "50%" cannot say that.
 */
function ProgressRibbon({
  episodes,
  isWatched,
}: {
  episodes: TmdbEpisode[];
  isWatched: (episode: TmdbEpisode) => boolean;
}) {
  const watched = episodes.filter(isWatched).length;
  // Long runs get a tighter gap so 60 blocks still read as one bar rather than
  // dissolving into gravel.
  const gap = episodes.length > 32 ? 1.5 : 3;

  return (
    <View style={{ gap: 7 }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between' }}
      >
        <Text variant="osd" color={withAlpha(colors.paper, 0.5)}>
          Progress
        </Text>
        <Text variant="osd" color={colors.paper}>
          {watched} of {episodes.length} viewed
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap }}>
        {episodes.map((episode) => (
          <View
            key={episode.id}
            style={{
              flex: 1,
              height: 9,
              borderRadius: 2,
              borderWidth: 1,
              borderColor: colors.noir,
              backgroundColor: isWatched(episode)
                ? colors.blood
                : colors.inkRaised,
            }}
          />
        ))}
      </View>
    </View>
  );
}

/**
 * The one action worth making obvious on a season screen: keep going.
 *
 * Pinned above the list so resuming a run never means scrolling to remember
 * where you stopped. When the season is finished it stops being a button and
 * becomes the receipt.
 */
function NextUpCard({
  episode,
  total,
  onPress,
}: {
  episode: TmdbEpisode | undefined;
  total: number;
  onPress: (episode: TmdbEpisode) => void;
}) {
  if (!episode) {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: colors.paper,
          borderRadius: radius.lg,
          borderWidth: 2,
          borderColor: colors.noir,
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}
      >
        <Ionicons name="checkmark-done" size={20} color={colors.ink} />
        <View style={{ flex: 1 }}>
          <Text variant="label" color={colors.ink}>
            Season complete
          </Text>
          <Text variant="bodySm" color={withAlpha(colors.ink, 0.6)}>
            All {total} episodes viewed.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <PressableScale
      onPress={() => onPress(episode)}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={`Next up, episode ${episode.episode_number}, ${episode.name}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.blood,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: colors.noir,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="osd" color={withAlpha(colors.paper, 0.7)}>
          Next up · Episode {pad(episode.episode_number)}
        </Text>
        <Text variant="title" color={colors.paper} numberOfLines={1}>
          {episode.name}
        </Text>
      </View>

      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: radius.md,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.paper,
          borderWidth: 2,
          borderColor: colors.noir,
        }}
      >
        <Ionicons name="play" size={17} color={colors.ink} />
      </View>
    </PressableScale>
  );
}

export default function SeasonScreen() {
  const { id, season } = useLocalSearchParams<{ id: string; season: string }>();
  const router = useRouter();

  const tvId = Number(id);
  const seasonNumber = Number(season);

  const { data, isPending, error } = useSeason(id, seasonNumber);
  const { isWatched, toggle } = useWatchedEpisodes(tvId);

  const episodes = useMemo(() => data?.episodes ?? [], [data]);
  const seen = (episode: TmdbEpisode) =>
    isWatched(episode.season_number, episode.episode_number);
  const nextUp = episodes.find((episode) => !seen(episode));

  const openEpisode = (episode: TmdbEpisode) =>
    router.push(
      `/tv/${id}/season/${episode.season_number}/episode/${episode.episode_number}` as never
    );

  const renderEpisode = ({ item }: { item: TmdbEpisode }) => {
    const watched = seen(item);
    const still = stillUrl(item.still_path, 'w300');
    const meta = [airDate(item.air_date), runtimeLabel(item.runtime)]
      .filter(Boolean)
      .join('   ·   ');

    return (
      /**
       * Two targets, side by side, never nested. The old row put the Mark
       * button *inside* the pressable that opened the episode, which meant the
       * two actions overlapped and the small one had to win by responder order.
       * Splitting them into siblings with a hard rule between makes the split
       * something you can see before you tap it rather than something you learn
       * by getting it wrong.
       */
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.inkRaised,
          borderRadius: radius.md,
          borderWidth: 2,
          borderColor: colors.noir,
          overflow: 'hidden',
        }}
      >
        <PressableScale
          onPress={() => openEpisode(item)}
          scaleTo={0.985}
          accessibilityRole="button"
          accessibilityLabel={`Episode ${item.episode_number}, ${item.name}`}
          style={{ flex: 1, flexDirection: 'row', gap: 12 }}
        >
          <View
            style={{
              width: STILL_WIDTH,
              backgroundColor: colors.inkDeep,
              opacity: watched ? 0.55 : 1,
            }}
          >
            {/*
              Absolute, NOT `height: '100%'`. This column has no height of its
              own — it stretches to whatever the text beside it measures — and a
              percentage against an auto-height parent is undefined in Yoga, so
              a flow child here sizes the whole row to the still.
            */}
            {still ? (
              <Image
                source={{ uri: still }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={160}
                cachePolicy="memory-disk"
              />
            ) : (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { alignItems: 'center', justifyContent: 'center' },
                ]}
              >
                <Ionicons
                  name="tv-outline"
                  size={22}
                  color={withAlpha(colors.paper, 0.4)}
                />
              </View>
            )}

            <View
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                backgroundColor: colors.blood,
                borderRadius: radius.sm,
                borderWidth: 1.5,
                borderColor: colors.noir,
                paddingHorizontal: 6,
                paddingVertical: 1,
              }}
            >
              <Text variant="osd" color={colors.paper}>
                E{pad(item.episode_number)}
              </Text>
            </View>
          </View>

          <View style={{ flex: 1, paddingVertical: 12, gap: 5 }}>
            <Text
              variant="heading"
              color={watched ? withAlpha(colors.paper, 0.6) : colors.paper}
              numberOfLines={2}
            >
              {item.name}
            </Text>

            {item.overview ? (
              <Text
                variant="bodySm"
                color={withAlpha(colors.paper, 0.55)}
                numberOfLines={2}
              >
                {item.overview}
              </Text>
            ) : null}

            {meta ? (
              <Text
                variant="chip"
                color={withAlpha(colors.paper, 0.45)}
                numberOfLines={1}
                style={{ marginTop: 1 }}
              >
                {meta}
              </Text>
            ) : null}
          </View>
        </PressableScale>

        {/* The tick column. Full-height, so the target is the whole edge. */}
        <PressableScale
          onPress={() => {
            Haptics.impactAsync(
              watched
                ? Haptics.ImpactFeedbackStyle.Light
                : Haptics.ImpactFeedbackStyle.Medium
            );
            toggle(item.season_number, item.episode_number);
          }}
          scaleTo={0.94}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: watched }}
          accessibilityLabel={
            watched
              ? `Mark episode ${item.episode_number} not viewed`
              : `Mark episode ${item.episode_number} viewed`
          }
          style={{
            width: TICK_WIDTH,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            borderLeftWidth: 2,
            borderLeftColor: colors.noir,
            backgroundColor: watched ? colors.paper : colors.inkRaised,
          }}
        >
          <Ionicons
            name={watched ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={watched ? colors.ink : withAlpha(colors.paper, 0.55)}
          />
          <Text
            variant="osd"
            color={watched ? colors.ink : withAlpha(colors.paper, 0.55)}
          >
            {watched ? 'Seen' : 'Mark'}
          </Text>
        </PressableScale>
      </View>
    );
  };

  return (
    <Screen osd={{ left: 'SERIES', right: `SEASON ${pad(seasonNumber)}` }}>
      {/* Fixed, so back is reachable without scrolling to the top of a long run. */}
      <View style={{ paddingHorizontal: grid.screenPadding, paddingTop: 6 }}>
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to the series"
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
      </View>

      {isPending ? (
        <ActivityIndicator
          size="large"
          color={colors.blood}
          style={{ marginTop: 40 }}
        />
      ) : error ? (
        <View
          style={{
            paddingHorizontal: grid.screenPadding,
            marginTop: 32,
            gap: 14,
          }}
        >
          <Display variant="displaySm">Season unavailable</Display>
          <Text variant="body" color={withAlpha(colors.paper, 0.6)}>
            This season didn&apos;t come back from TMDB. Go back and try another.
          </Text>
        </View>
      ) : (
        <FlatList
          data={episodes}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderEpisode}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: grid.screenPadding,
            paddingBottom: 40,
            gap: 12,
          }}
          /*
           * The whole header scrolls away with the list. On a 22-episode season
           * a pinned block of synopsis costs a third of the screen for something
           * you read once.
           */
          ListHeaderComponent={
            <View style={{ gap: 14, paddingBottom: 4 }}>
              <Display variant="display" numberOfLines={2}>
                {data?.name ?? `Season ${seasonNumber}`}
              </Display>

              {data?.overview ? (
                <Text
                  variant="bodySm"
                  color={withAlpha(colors.paper, 0.6)}
                  numberOfLines={3}
                >
                  {data.overview}
                </Text>
              ) : null}

              {episodes.length ? (
                <ProgressRibbon episodes={episodes} isWatched={seen} />
              ) : null}

              <FilmStrip height={10} pitch={16} />

              {episodes.length ? (
                <NextUpCard
                  episode={nextUp}
                  total={episodes.length}
                  onPress={openEpisode}
                />
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text
              variant="body"
              color={withAlpha(colors.paper, 0.6)}
              style={{ textAlign: 'center', marginTop: 30 }}
            >
              TMDB lists no episodes for this season yet.
            </Text>
          }
        />
      )}
    </Screen>
  );
}

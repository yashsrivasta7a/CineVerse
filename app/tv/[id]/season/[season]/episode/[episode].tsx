import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Barcode } from '@/components/kino/Barcode';
import { DashedRule } from '@/components/kino/DashedRule';
import { FrameMount } from '@/components/kino/FrameMount';
import { RatingStars } from '@/components/kino/RatingStars';
import { ReelScrubber } from '@/components/kino/ReelScrubber';
import { TornSection } from '@/components/kino/TornSection';
import { CastRow } from '@/components/media/CastRow';
import { SectionHeader } from '@/components/media/SectionHeader';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { stillUrl } from '@/lib/api/tmdb/images';
import type { TmdbCrewMember } from '@/lib/api/tmdb/types';
import { airDate, runtimeLabel } from '@/lib/format/airDate';
import {
  useEpisode,
  useSeason,
  useTvDetails,
  useWatchedEpisodes,
} from '@/lib/queries/tv';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

/** Two digits, always — E7 and E12 must not shuffle the layout between frames. */
const pad = (value: number) => String(value).padStart(2, '0');

const votes = (count: number) =>
  count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);

/**
 * Underdamped hard, and deliberately so. This drives one thing — the VIEWED
 * mark landing on the frame — and a rubber stamp that eases politely into place
 * is not a rubber stamp.
 */
const STAMP_SPRING = {
  damping: 11,
  stiffness: 190,
  mass: 0.6,
  reduceMotion: ReduceMotion.System,
} as const;

const ENTER_SPRING = {
  damping: 18,
  stiffness: 150,
  mass: 0.9,
  reduceMotion: ReduceMotion.System,
} as const;

/** Square chrome button. Matches the back chip on the season screen. */
function IconChip({
  icon,
  onPress,
  label,
  disabled,
}: {
  icon: 'arrow-back' | 'chevron-back' | 'chevron-forward';
  onPress: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.inkRaised,
        borderWidth: 2,
        borderColor: colors.noir,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Ionicons name={icon} size={19} color={colors.paper} />
    </PressableScale>
  );
}

/** One credit on the paper block, tapping through to the person. */
function CreditLine({
  role,
  people,
  onOpen,
}: {
  role: string;
  people: TmdbCrewMember[];
  onOpen: (personId: number) => void;
}) {
  if (!people.length) return null;

  return (
    <View style={{ gap: 3 }}>
      <Text variant="osd" color={withAlpha(colors.ink, 0.5)}>
        {role}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {people.map((person, index) => (
          <PressableScale
            key={`${person.id}-${person.job}`}
            onPress={() => onOpen(person.id)}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel={person.name}
          >
            <Text variant="heading" color={colors.ink}>
              {person.name}
              {index < people.length - 1 ? ',' : ''}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

/**
 * One episode.
 *
 * The page is built on a single claim: an episode is a frame in a reel. The
 * still is mounted as film, the season runs underneath it as a strip you can
 * scrub, and the synopsis is torn out on paper the way a listing would be. Every
 * piece of it comes from the app's existing kit — the one new idea is the mount,
 * and it earns its place by being literally what the subject is.
 */
export default function EpisodeScreen() {
  const { id, season, episode } = useLocalSearchParams<{
    id: string;
    season: string;
    episode: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tvId = Number(id);
  const seasonNumber = Number(season);
  const episodeNumber = Number(episode);

  const { data, isPending, error } = useEpisode(
    id,
    seasonNumber,
    episodeNumber
  );
  // Both already cached by the screens you arrive through, so neither costs a
  // request in the normal path — the show for its name, the season for the reel.
  const { data: show } = useTvDetails(id);
  const { data: seasonData } = useSeason(id, seasonNumber);
  const { isWatched, toggle } = useWatchedEpisodes(tvId);

  const watched = isWatched(seasonNumber, episodeNumber);

  const episodes = useMemo(() => seasonData?.episodes ?? [], [seasonData]);
  const position = episodes.findIndex(
    (item) => item.episode_number === episodeNumber
  );
  const previous = position > 0 ? episodes[position - 1] : undefined;
  const next =
    position >= 0 && position < episodes.length - 1
      ? episodes[position + 1]
      : undefined;

  const directors = useMemo(
    () => (data?.crew ?? []).filter((member) => member.job === 'Director'),
    [data]
  );
  const writers = useMemo(
    () =>
      (data?.crew ?? [])
        .filter((member) => member.department === 'Writing')
        .slice(0, 3),
    [data]
  );

  /** Everything TMDB holds for this episode except the frame already on screen. */
  const contactSheet = useMemo(
    () =>
      (data?.images?.stills ?? [])
        .filter((frame) => frame.file_path !== data?.still_path)
        .slice(0, 12),
    [data]
  );

  const enter = useSharedValue(0);
  // Empty deps on purpose — this is a mount animation, and listing the shared
  // value would trip the React Compiler's immutability rule the moment the body
  // writes to it. Same trade the tab bar makes.
  useEffect(() => {
    enter.value = withSpring(1, ENTER_SPRING);
  }, []);

  const heroStyle = useAnimatedStyle(() => {
    const value = Math.min(1, Math.max(0, enter.value));
    return {
      opacity: value,
      transform: [{ scale: 0.965 + value * 0.035 }],
    };
  });

  const stamp = useDerivedValue(() =>
    withSpring(watched ? 1 : 0, STAMP_SPRING)
  );

  const stampStyle = useAnimatedStyle(() => {
    const value = stamp.value;
    return {
      opacity: Math.min(1, Math.max(0, value)),
      transform: [
        { scale: 0.55 + value * 0.45 },
        { rotate: `${-10 * Math.min(1, Math.max(0, value))}deg` },
      ],
    };
  });

  /**
   * `replace`, not `push`. Hopping five frames down the reel should not build a
   * five-deep stack whose back button walks you through every one of them —
   * back belongs to the season list you came from.
   */
  const goToEpisode = (target: number) => {
    router.replace(
      `/tv/${id}/season/${seasonNumber}/episode/${target}` as never
    );
  };

  const openPerson = (personId: number) => {
    router.push(`/person/${personId}` as never);
  };

  const osdLeft = show?.name ? show.name.toUpperCase() : 'SERIES';

  if (isPending) {
    return (
      <Screen osd={{ left: osdLeft, right: `S${pad(seasonNumber)}` }}>
        <ActivityIndicator
          size="large"
          color={colors.blood}
          style={{ marginTop: 60 }}
        />
      </Screen>
    );
  }

  if (error || !data) {
    return (
      <Screen osd={{ left: osdLeft, right: 'NO SIGNAL' }} padded>
        <View style={{ flex: 1, justifyContent: 'center', gap: 16 }}>
          <Display variant="displaySm">Frame missing</Display>
          <Text variant="body" color={withAlpha(colors.paper, 0.6)}>
            This episode didn&apos;t come back from TMDB. Go back and try
            another.
          </Text>
          <PressableScale
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              alignSelf: 'flex-start',
              backgroundColor: colors.blood,
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor: colors.noir,
              paddingHorizontal: 18,
              paddingVertical: 11,
            }}
          >
            <Text variant="osd" color={colors.paper}>
              Back to the season
            </Text>
          </PressableScale>
        </View>
      </Screen>
    );
  }

  const meta = [airDate(data.air_date), runtimeLabel(data.runtime)]
    .filter(Boolean)
    .join('   ·   ');

  return (
    <Screen
      osd={{ left: osdLeft, right: `E${pad(episodeNumber)}`, rec: watched }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 44 }}
      >
        <View style={{ paddingHorizontal: grid.screenPadding, paddingTop: 6 }}>
          <IconChip
            icon="arrow-back"
            onPress={() => router.back()}
            label="Back to the season"
          />
        </View>

        {/* The frame. */}
        <Animated.View
          style={[
            { paddingHorizontal: grid.screenPadding, marginTop: 14 },
            heroStyle,
          ]}
        >
          <FrameMount
            uri={stillUrl(data.still_path, 'original')}
            strip={13}
            pitch={21}
            corner={radius.md}
          >
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  right: 14,
                  bottom: 14,
                  borderWidth: 3,
                  borderColor: colors.blood,
                  borderRadius: radius.sm,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                },
                stampStyle,
              ]}
            >
              <Text variant="label" color={colors.blood}>
                Viewed
              </Text>
            </Animated.View>
          </FrameMount>
        </Animated.View>

        {/* Identity. */}
        <View
          style={{
            paddingHorizontal: grid.screenPadding,
            marginTop: 18,
            gap: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View
              style={{
                backgroundColor: colors.blood,
                borderWidth: 2,
                borderColor: colors.noir,
                borderRadius: radius.sm,
                paddingHorizontal: 8,
                paddingVertical: 2,
              }}
            >
              <Text variant="displayXs" color={colors.paper}>
                S{pad(seasonNumber)} E{pad(episodeNumber)}
              </Text>
            </View>

            {meta ? (
              <Text variant="osd" color={withAlpha(colors.paper, 0.5)}>
                {meta}
              </Text>
            ) : null}
          </View>

          <Display variant="display" numberOfLines={3}>
            {data.name}
          </Display>

          {data.vote_average > 0 ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
            >
              <RatingStars value={data.vote_average} size={14} />
              <Text variant="osd" color={withAlpha(colors.paper, 0.5)}>
                {data.vote_average.toFixed(1)} · {votes(data.vote_count)} votes
              </Text>
            </View>
          ) : null}
        </View>

        {/* The punch. */}
        <PressableScale
          onPress={() => {
            Haptics.impactAsync(
              watched
                ? Haptics.ImpactFeedbackStyle.Light
                : Haptics.ImpactFeedbackStyle.Heavy
            );
            toggle(seasonNumber, episodeNumber);
          }}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityState={{ checked: watched }}
          accessibilityLabel={
            watched ? 'Mark this episode unviewed' : 'Mark this episode viewed'
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 18,
            marginHorizontal: grid.screenPadding,
            paddingHorizontal: 16,
            paddingVertical: 13,
            borderRadius: radius.lg,
            borderWidth: 2,
            borderColor: colors.noir,
            backgroundColor: watched ? colors.paper : colors.blood,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
            <Ionicons
              name={watched ? 'checkmark-circle' : 'ellipse-outline'}
              size={19}
              color={watched ? colors.ink : colors.paper}
            />
            <Text variant="label" color={watched ? colors.ink : colors.paper}>
              {watched ? 'Viewed · tap to undo' : 'Mark as viewed'}
            </Text>
          </View>

          <Barcode
            value={data.id}
            height={18}
            bars={16}
            color={watched ? colors.ink : colors.paper}
          />
        </PressableScale>

        {/* The listing. */}
        <TornSection
          background={colors.paper}
          seed={data.episode_number + 3}
          style={{ marginTop: 26 }}
          contentStyle={{
            paddingHorizontal: grid.screenPadding,
            paddingTop: 6,
            paddingBottom: 18,
            gap: 14,
          }}
        >
          <Text variant="osd" color={withAlpha(colors.ink, 0.5)}>
            Synopsis
          </Text>

          <Text variant="body" color={colors.ink}>
            {data.overview ||
              'TMDB has no synopsis for this episode yet. The frames above are all there is to go on.'}
          </Text>

          {directors.length || writers.length ? (
            <>
              <DashedRule
                color={withAlpha(colors.ink, 0.3)}
                thickness={2}
                dash={7}
                gap={6}
              />

              <View style={{ flexDirection: 'row', gap: 24 }}>
                <View style={{ flex: 1 }}>
                  <CreditLine
                    role="Directed by"
                    people={directors}
                    onOpen={openPerson}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <CreditLine
                    role="Written by"
                    people={writers}
                    onOpen={openPerson}
                  />
                </View>
              </View>
            </>
          ) : null}

          <Barcode
            value={data.id}
            height={22}
            bars={26}
            color={colors.ink}
            style={{ alignSelf: 'flex-end', marginTop: 2 }}
          />
        </TornSection>

        {data.guest_stars?.length ? (
          <View style={{ marginTop: 28, gap: 14 }}>
            <SectionHeader
              title="Guest stars"
              subtitle="Only for this episode. Long-press to block someone from your deck."
              style={{ paddingHorizontal: grid.screenPadding }}
            />
            <CastRow cast={data.guest_stars} limit={16} />
          </View>
        ) : null}

        {contactSheet.length ? (
          <View style={{ marginTop: 28, gap: 14 }}>
            <SectionHeader
              title="Contact sheet"
              subtitle={`${contactSheet.length} more frames from this episode`}
              style={{ paddingHorizontal: grid.screenPadding }}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: grid.screenPadding,
                gap: 10,
              }}
            >
              {contactSheet.map((frame) => (
                <FrameMount
                  key={frame.file_path}
                  uri={stillUrl(frame.file_path, 'w300')}
                  strip={8}
                  pitch={14}
                  style={{ width: 214 }}
                />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* The reel. */}
        {episodes.length > 1 ? (
          <View style={{ marginTop: 30, gap: 14 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                paddingHorizontal: grid.screenPadding,
              }}
            >
              <View>
                <Display variant="displaySm">The reel</Display>
                <Text
                  variant="osd"
                  color={withAlpha(colors.paper, 0.5)}
                  style={{ marginTop: 6 }}
                >
                  Season {pad(seasonNumber)} · {episodes.length} episodes
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <IconChip
                  icon="chevron-back"
                  disabled={!previous}
                  onPress={() =>
                    previous && goToEpisode(previous.episode_number)
                  }
                  label={
                    previous
                      ? `Previous episode, ${previous.name}`
                      : 'No previous episode'
                  }
                />
                <IconChip
                  icon="chevron-forward"
                  disabled={!next}
                  onPress={() => next && goToEpisode(next.episode_number)}
                  label={next ? `Next episode, ${next.name}` : 'No next episode'}
                />
              </View>
            </View>

            <ReelScrubber
              episodes={episodes}
              current={episodeNumber}
              onSelect={goToEpisode}
              isWatched={(number) => isWatched(seasonNumber, number)}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

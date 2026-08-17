import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Barcode } from '@/components/decor/Barcode';
import { DashedCard } from '@/components/decor/DashedCard';
import { FilmStrip } from '@/components/decor/FilmStrip';
import { RatingStars } from '@/components/decor/RatingStars';
import { TicketCard } from '@/components/decor/TicketCard';
import { TornEdge } from '@/components/decor/TornEdge';
import { TornSection } from '@/components/decor/TornSection';
import { CastRow } from '@/components/media/CastRow';
import { ProviderRow } from '@/components/media/ProviderRow';
import { ReviewCard } from '@/components/media/ReviewCard';
import { SectionBlock } from '@/components/media/SectionBlock';
import { VideoRow } from '@/components/media/VideoRow';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { backdropUrlOrPlaceholder, posterUrl } from '@/lib/api/tmdb/images';
import { DEFAULT_WATCH_REGION, resolveProviders } from '@/lib/api/tmdb/providers';
import { useTvDetails, useWatchedEpisodes } from '@/lib/queries/tv';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

export default function TvDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [aboutExpanded, setAboutExpanded] = useState(false);

  const { data: show, isPending, error } = useTvDetails(id);
  const { watchedCount } = useWatchedEpisodes(show?.id);

  const providers = useMemo(
    () => resolveProviders(show?.['watch/providers'], DEFAULT_WATCH_REGION),
    [show]
  );

  const cast = useMemo(
    () =>
      (show?.aggregate_credits?.cast ?? []).map((member) => ({
        id: member.id,
        name: member.name,
        // TV credits carry roles[] rather than a single character, because a
        // performer can hold several parts across a run.
        character: member.roles?.[0]?.character ?? '',
        profile_path: member.profile_path,
      })),
    [show]
  );

  if (isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.blood} />
      </View>
    );
  }

  if (error || !show) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.ink,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: grid.screenPadding,
        }}
      >
        <Display variant="displaySm" align="center">Series not found</Display>
        <Button label="Go back" onPress={() => router.back()} full={false} />
      </View>
    );
  }

  const year = show.first_air_date ? show.first_air_date.slice(0, 4) : null;
  const seasons = show.seasons.filter((season) => season.season_number > 0);
  const progress =
    show.number_of_episodes > 0
      ? Math.min(1, watchedCount / show.number_of_episodes)
      : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.ink }}>
      <StatusBar hidden />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View
          style={{
            paddingTop: insets.top + 8,
            paddingHorizontal: grid.screenPadding,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <PressableScale
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              width: 42,
              height: 42,
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

          <Chip label={`${show.number_of_seasons} seasons`} />
        </View>

        <DashedCard style={{ marginHorizontal: grid.screenPadding, marginTop: 14 }}>
          <Display variant="displayXl" color={colors.paper} numberOfLines={3}>
            {show.name}
          </Display>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            {show.origin_country?.[0] ? <Chip label={show.origin_country[0]} /> : null}
            {show.genres?.[0] ? <Chip label={show.genres[0].name} /> : null}
            {show.episode_run_time?.[0] ? (
              <Chip label={`${show.episode_run_time[0]}min`} />
            ) : null}
            {year ? <Chip label={year} /> : null}
          </View>

          <View
            style={{
              marginTop: 14,
              borderRadius: radius.md,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: colors.noir,
            }}
          >
            <Image
              source={{
                uri: backdropUrlOrPlaceholder(show.backdrop_path ?? show.poster_path, 'w780'),
              }}
              style={{ width: '100%', aspectRatio: 16 / 11 }}
              contentFit="cover"
              transition={220}
              cachePolicy="memory-disk"
            />
          </View>

          {show.tagline ? (
            <Text variant="script" color={colors.paper} style={{ marginTop: 10, marginLeft: 2 }}>
              {show.tagline}
            </Text>
          ) : null}
        </DashedCard>

        <FilmStrip height={12} pitch={18} style={{ marginTop: 22 }} />

        {/* Your progress — real counts, no invented percentages */}
        <View style={{ paddingHorizontal: grid.screenPadding, marginTop: 20 }}>
          <TicketCard pageBackground={colors.ink} showTearLine={false} notchOffset={54}>
            <View
              style={{
                padding: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 14,
              }}
            >
              <View style={{ gap: 6, flex: 1 }}>
                <Text variant="osd" color={withAlpha(colors.ink, 0.5)}>Your progress</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Display variant="displaySm" color={colors.ink}>
                    {`${watchedCount}/${show.number_of_episodes}`}
                  </Display>
                  <RatingStars value={show.vote_average} size={13} />
                </View>

                <View
                  style={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: withAlpha(colors.ink, 0.18),
                    overflow: 'hidden',
                    marginTop: 2,
                  }}
                >
                  <View
                    style={{
                      width: `${progress * 100}%`,
                      height: '100%',
                      backgroundColor: colors.blood,
                    }}
                  />
                </View>
              </View>

              <Barcode value={show.id} height={40} bars={14} />
            </View>
          </TicketCard>
        </View>

        {show.overview ? (
          <TornSection background={colors.blood} seed={5} style={{ marginTop: 26 }}>
            <View style={{ paddingHorizontal: grid.screenPadding, paddingVertical: 18, gap: 12 }}>
              <Display variant="display" color={colors.paper}>About series</Display>
              <Text
                variant="body"
                color={colors.paper}
                numberOfLines={aboutExpanded ? undefined : 5}
              >
                {show.overview}
              </Text>

              {show.overview.length > 220 ? (
                <PressableScale
                  onPress={() => setAboutExpanded((previous) => !previous)}
                  accessibilityRole="button"
                  accessibilityLabel={aboutExpanded ? 'Show less' : 'Show more'}
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: colors.noir,
                    borderRadius: radius.pill,
                    paddingHorizontal: 18,
                    paddingVertical: 9,
                  }}
                >
                  <Text variant="label" color={colors.paper}>
                    {aboutExpanded ? 'See less' : 'See more'}
                  </Text>
                </PressableScale>
              ) : null}
            </View>
          </TornSection>
        ) : null}

        {/* Seasons */}
        {seasons.length ? (
          <SectionBlock title="Seasons" bleed style={{ marginTop: 28 }}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: grid.screenPadding, gap: 12 }}
            >
              {seasons.map((season) => (
                <PressableScale
                  key={season.id}
                  onPress={() =>
                    router.push(`/tv/${show.id}/season/${season.season_number}` as never)
                  }
                  accessibilityRole="link"
                  accessibilityLabel={`${season.name}, ${season.episode_count} episodes`}
                  style={{ width: 124, gap: 7 }}
                >
                  <View
                    style={{
                      width: 124,
                      aspectRatio: 2 / 3,
                      borderRadius: radius.md,
                      overflow: 'hidden',
                      borderWidth: 2,
                      borderColor: colors.noir,
                      backgroundColor: colors.inkRaised,
                    }}
                  >
                    {season.poster_path ? (
                      <Image
                        source={{ uri: posterUrl(season.poster_path, 'w342')! }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={160}
                        cachePolicy="memory-disk"
                      />
                    ) : null}
                    <LinearGradient
                      colors={['transparent', withAlpha(colors.noir, 0.9)]}
                      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%' }}
                    />
                    <Text
                      variant="chip"
                      color={colors.paper}
                      numberOfLines={1}
                      style={{ position: 'absolute', left: 8, right: 8, bottom: 7 }}
                    >
                      {season.episode_count} eps
                    </Text>
                  </View>
                  <Text variant="chip" numberOfLines={1}>{season.name}</Text>
                </PressableScale>
              ))}
            </ScrollView>
          </SectionBlock>
        ) : null}

        {cast.length ? (
          <SectionBlock
            title="Cast"
            subtitle="Long-press to block someone"
            bleed
            style={{ marginTop: 28 }}
          >
            <CastRow cast={cast} />
          </SectionBlock>
        ) : null}

        {providers.providers.length ? (
          <SectionBlock title="Where to watch" style={{ marginTop: 28 }}>
            <ProviderRow data={providers} region={DEFAULT_WATCH_REGION} />
          </SectionBlock>
        ) : null}

        {show.videos?.results?.length ? (
          <SectionBlock title="On video" subtitle="Trailers and featurettes" bleed style={{ marginTop: 28 }}>
            <VideoRow videos={show.videos.results} />
          </SectionBlock>
        ) : null}

        {show.reviews?.results?.length ? (
          <SectionBlock
            title="Notes from readers"
            subtitle="Real audience reviews"
            bleed
            style={{ marginTop: 28 }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: grid.screenPadding, gap: 12 }}
            >
              {show.reviews.results.slice(0, 8).map((review) => (
                <ReviewCard key={review.id} review={review} width={286} />
              ))}
            </ScrollView>
          </SectionBlock>
        ) : null}

        {show.homepage ? (
          <View style={{ paddingHorizontal: grid.screenPadding, marginTop: 28 }}>
            <Button
              label="Visit homepage"
              onPress={() => Linking.openURL(show.homepage as string)}
              icon={<Ionicons name="globe-outline" size={16} color={colors.paper} />}
            />
          </View>
        ) : null}

        <TornEdge fill={colors.blood} seed={9} style={{ marginTop: 34 }} />
        <View style={{ backgroundColor: colors.blood, paddingVertical: 14 }}>
          <Text variant="osd" color={colors.paper} style={{ textAlign: 'center' }}>
            [ END OF REEL ]
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

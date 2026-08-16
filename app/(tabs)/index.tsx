import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Marquee } from "@/components/kino/Marquee";
import { PolaroidFrame, tiltFromId } from "@/components/kino/PolaroidFrame";
import { TornSection } from "@/components/kino/TornSection";
import { PosterCard } from "@/components/media/PosterCard";
import { PosterRow } from "@/components/media/PosterRow";
import { Display } from "@/components/ui/Display";
import { PressableScale } from "@/components/ui/PressableScale";
import { Screen } from "@/components/ui/Screen";
import { SearchField } from "@/components/ui/SearchField";
import { Text } from "@/components/ui/Text";

import { ContinueWatchingRow } from "@/components/media/ContinueWatchingRow";
import { MOOD_STOPS } from "@/components/media/MoodSlider";
import { useGenres } from "@/lib/queries/reference";
import { useTrendingMovies } from "@/lib/queries/trending";
import { useContinueWatching } from "@/lib/queries/tv";
import { PRESETS, genreRail, personRail, type CollectionPreset } from "@/lib/recommend/presets";
import { selectByFacet, usePrefs } from "@/lib/store/prefs";
import { colors, grid, radius, withAlpha } from "@/theme/tokens";

/** Rails built from the user's own taste, ahead of the generic ones. */
const MAX_TASTE_RAILS = 3;

/**
 * Wrapped so the heading and the rail disappear together. `ContinueWatchingRow`
 * renders null when nothing has been marked watched, and a lone heading over
 * empty space reads as a bug.
 */
function ContinueWatchingSection() {
  const shows = useContinueWatching();
  if (!shows.length) return null;

  return (
    <View style={{ marginTop: 28, gap: 12 }}>
      <View style={{ paddingHorizontal: grid.screenPadding }}>
        <Display variant="displaySm">Continue watching</Display>
        <Text variant="osd" color={withAlpha(colors.paper, 0.5)} style={{ marginTop: 4 }}>
          Picked up where you left off
        </Text>
      </View>
      <ContinueWatchingRow />
    </View>
  );
}

export default function Selection() {
  const router = useRouter();
  const { user } = useUser();

  const entries = usePrefs((state) => state.entries);
  const mood = usePrefs((state) => state.mood);

  const { data: trending } = useTrendingMovies();
  const { data: genres } = useGenres('movie');

  const trendingTitles = useMemo(() => (trending ?? []).slice(0, 12), [trending]);

  /**
   * Rails are data. Personal ones first — the whole point of onboarding is that
   * the home screen looks different for different people.
   */
  const rails = useMemo<CollectionPreset[]>(() => {
    const personal: CollectionPreset[] = [];

    const likedGenres = selectByFacet(entries, 'genre', 'like');
    for (const entry of likedGenres.slice(0, MAX_TASTE_RAILS)) {
      const name =
        entry.label ??
        genres?.find((genre) => String(genre.id) === entry.value)?.name ??
        null;
      if (name) personal.push(genreRail(Number(entry.value), name));
    }

    const likedPeople = selectByFacet(entries, 'person', 'like');
    for (const entry of likedPeople.slice(0, 2)) {
      if (entry.label) personal.push(personRail(Number(entry.value), entry.label));
    }

    return [
      ...personal,
      PRESETS.acclaimed,
      PRESETS.thisYear,
      PRESETS.shortWatch,
      PRESETS.popular,
    ];
  }, [entries, genres]);

  const openCollection = (preset: CollectionPreset) =>
    router.push(`/collection/${preset.slug}` as never);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 140 }}
      >
        {/* Masthead */}
        <View
          style={{
            paddingHorizontal: grid.screenPadding,
            paddingTop: 6,
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Display variant="displayXl">CINEVERSE</Display>
            <Text
              variant="script"
              color={colors.blood}
              style={{ marginTop: -4, marginLeft: 4, transform: [{ rotate: '-4deg' }] }}
            >
              Your Movie Universe
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={{ marginTop: 8 }}
          >
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 2,
                  borderColor: colors.paper,
                }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.blood,
                  borderWidth: 2,
                  borderColor: colors.paper,
                }}
              >
                <Ionicons name="person" size={18} color={colors.paper} />
              </View>
            )}
          </Pressable>
        </View>

        <TornSection
          background={colors.blood}
          seed={3}
          variant="fine"
          style={{ marginTop: 16 }}
          contentStyle={{ paddingVertical: 4 }}
        >
          <Marquee
            text="WELCOME TO CINEVERSE · DISCOVER NEW FAVORITES · EXPLORE THE ARCHIVE"
            variant="displaySm"
            color={colors.paper}
            speed={46}
          />
        </TornSection>

        <View style={{ paddingHorizontal: grid.screenPadding, marginTop: 18, gap: 10 }}>
          <SearchField
            placeholder="Search for a movie"
            onPress={() => router.push('/search')}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PressableScale
              onPress={() => router.push('/mood' as never)}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={
                mood === null ? 'Set your mood' : `Mood: ${MOOD_STOPS[mood]}. Change it`
              }
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: mood === null ? colors.inkRaised : colors.blood,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: colors.noir,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                <Ionicons
                  name="happy-outline"
                  size={17}
                  color={mood === null ? colors.blood : colors.paper}
                />
                <Text variant="label" color={colors.paper}>
                  {mood === null ? 'Set mood' : MOOD_STOPS[mood]}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={15}
                color={withAlpha(colors.paper, 0.5)}
              />
            </PressableScale>

            <PressableScale
              onPress={() => router.push('/filters' as never)}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel="Filters"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 9,
                backgroundColor: colors.inkRaised,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: colors.noir,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="options-outline" size={17} color={colors.blood} />
              <Text variant="label">Filters</Text>
            </PressableScale>

            <PressableScale
              onPress={() => router.push('/upcoming' as never)}
              scaleTo={0.97}
              accessibilityRole="link"
              accessibilityLabel="Premieres, coming soon"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.inkRaised,
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: colors.noir,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Ionicons name="calendar-outline" size={17} color={colors.blood} />
            </PressableScale>
          </View>
        </View>

        {/* Continue Watching — hides itself entirely until an episode is
            actually marked, rather than showing an empty rail. */}
        <ContinueWatchingSection />

        {/* Trending — the red feature band */}
        {trendingTitles.length > 0 ? (
          <TornSection
            background={colors.blood}
            seed={17}
            style={{ marginTop: 26 }}
            contentStyle={{ paddingVertical: 16 }}
          >
            <View style={{ paddingHorizontal: grid.screenPadding }}>
              <Display variant="displaySm" color={colors.paper}>
                Top trending
              </Display>
              <Text variant="osd" color={withAlpha(colors.paper, 0.75)} style={{ marginTop: 4 }}>
                Across the whole archive today
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              contentContainerStyle={{
                paddingHorizontal: grid.screenPadding,
                paddingTop: 16,
                paddingBottom: 6,
                gap: 16,
              }}
            >
              {trendingTitles.map((title, index) => (
                <PolaroidFrame
                  key={`${title.id}-${index}`}
                  tilt={tiltFromId(title.id)}
                  caption={index === 0 ? 'Magic from the first frame' : undefined}
                  style={{ width: 140 }}
                >
                  <PosterCard title={title} rank={index + 1} />
                </PolaroidFrame>
              ))}
            </ScrollView>
          </TornSection>
        ) : null}

        {/* Rails */}
        <View style={{ marginTop: 30, gap: 30 }}>
          {rails.map((preset) => (
            <PosterRow key={preset.slug} preset={preset} onSeeAll={openCollection} />
          ))}
        </View>

        <Text
          variant="osd"
          color={withAlpha(colors.paper, 0.3)}
          style={{ textAlign: 'center', marginTop: 36 }}
        >
          [ END OF REEL ]
        </Text>
      </ScrollView>
    </Screen>
  );
}

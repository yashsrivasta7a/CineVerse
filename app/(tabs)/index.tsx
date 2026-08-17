import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PosterRow } from "@/components/media/PosterRow";
import { Button } from "@/components/ui/Button";
import { Display } from "@/components/ui/Display";
import { PressableScale } from "@/components/ui/PressableScale";
import { Screen } from "@/components/ui/Screen";
import { SearchField } from "@/components/ui/SearchField";
import { Text } from "@/components/ui/Text";

import { ContinueWatchingRow } from "@/components/media/ContinueWatchingRow";
import { MOOD_STOPS } from "@/lib/recommend/moods";
import { getTasteSignals } from "@/db/queries/verdicts";
import { qk } from "@/lib/queries/keys";
import { useGenres } from "@/lib/queries/reference";
import { useContinueWatching } from "@/lib/queries/tv";
import { applyTaste, tasteFromPrefs } from "@/lib/recommend/params";
import { wildcardParams } from "@/lib/recommend/pool";
import { buildVector, learnedTaste } from "@/lib/recommend/taste";
import {
  genreRail,
  moodRail,
  wildcardRail,
  type CollectionPreset,
} from "@/lib/recommend/presets";
import { selectByFacet, usePrefs } from "@/lib/store/prefs";
import { colors, grid, radius, tabBar } from "@/theme/tokens";
import { fontFamily } from "@/theme/typography";

/**
 * Genre rails on the page. Two, so the strongest signals stand alone rather
 * than dissolving into a catalogue — anyone who wants more has the deck,
 * search, and a "see all" on every rail.
 */
const MAX_GENRE_RAILS = 2;

/**
 * Section headings use `Text`, not `Display`.
 *
 * `Display` renders a second copy of the string behind the first as a hard
 * offset shadow. At heading scale, repeated down a scroll, that doubled outline
 * closes up the counters of the condensed face and drags the small type beside
 * it down with it — so this page uses no shadowed type at all.
 */
function SectionHeading({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={{ paddingHorizontal: grid.screenPadding }}>
      <Text variant="displaySm" style={{ fontFamily: fontFamily.displayAlt }}>
        {title}
      </Text>
      {/* Muted, matching the rail subtitles. Full ivory here made every caption
          as loud as the heading it sits under. */}
      {caption ? (
        <Text variant="osd" color={colors.paperMuted} style={{ marginTop: 4 }}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Wrapped so the heading and the rail disappear together. `ContinueWatchingRow`
 * renders null when nothing has been marked watched, and a lone heading over
 * empty space reads as a bug.
 */
function ContinueWatchingSection() {
  const shows = useContinueWatching();
  if (!shows.length) return null;

  return (
    <View style={{ marginTop: 30, gap: 12 }}>
      <SectionHeading title="Continue watching" caption="Series you have episodes left in" />
      <ContinueWatchingRow />
    </View>
  );
}

/**
 * What the page shows when nothing came through.
 *
 * Every section on this screen hides itself when its own data fails, which is
 * right on its own — a heading over a hole is worse than no heading. Together it
 * is not: with the archive unreachable the page rendered a masthead, a search
 * field and an end-of-reel line, which reads as a broken build rather than a
 * broken connection. This is the one place that says so, and the one place that
 * offers a way out.
 */
function ArchiveDown({ onRetry }: { onRetry: () => void }) {
  return (
    <View
      style={{
        paddingHorizontal: grid.screenPadding,
        marginTop: 40,
        alignItems: 'center',
        gap: 14,
      }}
    >
      <Ionicons name="cloud-offline-outline" size={44} color={colors.blood} />
      <Display variant="displaySm" align="center">
        Nothing came through
      </Display>
      <Text
        variant="body"
        color={colors.paperMuted}
        style={{ textAlign: 'center' }}
      >
        Couldn&apos;t reach the archive. Check your connection and try again.
      </Text>
      <Button label="Try again" variant="paper" full={false} onPress={onRetry} />
    </View>
  );
}

export default function Selection() {
  const router = useRouter();
  const { user } = useUser();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const entries = usePrefs((state) => state.entries);
  const mood = usePrefs((state) => state.mood);

  const genresQuery = useGenres('movie');
  const { data: genres } = genresQuery;

  const taste = useMemo(() => tasteFromPrefs(entries), [entries]);

  /**
   * The same vector the deck learns into, rebuilt from history once per mount.
   * The page is a mirror of what the deck knows; it does not need to track the
   * vector live — the next visit reflects the latest swipes.
   */
  const vector = useMemo(() => buildVector(getTasteSignals('movie')), []);

  /**
   * The genre list is the page's one always-on request, and TanStack has already
   * retried it three times before isError lands. The rails cannot be consulted —
   * each owns a private query and hides itself on failure — so if this one is
   * down the page would render empty anyway; the honest card with a retry is
   * strictly better than a silent hole.
   */
  const archiveDown = genresQuery.isError;

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: qk.all });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  /**
   * Liked genres resolved to names once, for both the rails and the strapline.
   *
   * The stored label is preferred over the fetched list because it is already
   * there: onboarding writes the name it displayed alongside the id, so the
   * strapline can name a genre on the very first frame instead of waiting on
   * the genre request to land.
   */
  const likedGenres = useMemo(() => {
    return selectByFacet(entries, 'genre', 'like')
      .map((entry) => ({
        id: Number(entry.value),
        name:
          entry.label ??
          genres?.find((genre) => String(genre.id) === entry.value)?.name ??
          null,
      }))
      .filter((genre): genre is { id: number; name: string } => !!genre.name);
  }, [entries, genres]);

  /**
   * Every rail is a mirror of this user's own state — mood, then what the deck
   * has learned (falling back to what they told onboarding until there is
   * enough swipe history), then the exploration lane. Nothing on this page is
   * identical on two people's phones.
   */
  const rails = useMemo(() => {
    const out: CollectionPreset[] = [];

    const tonight = moodRail(mood);
    if (tonight) out.push(tonight);

    const learned = learnedTaste(vector);
    const source = learned.boostGenres.length ? 'learned' : 'stated';
    const railGenreIds =
      source === 'learned'
        ? learned.boostGenres.map(Number)
        : likedGenres.map((genre) => genre.id);

    for (const id of railGenreIds.slice(0, MAX_GENRE_RAILS)) {
      const name =
        likedGenres.find((genre) => genre.id === id)?.name ??
        genres?.find((genre) => genre.id === id)?.name;
      if (name) out.push(genreRail(id, name, source));
    }

    out.push(wildcardRail(wildcardParams(vector)));

    // The user's rejections hold on every rail — including the wildcard one.
    // "Off your usual" means outside your favourites, never inside your nevers.
    return out.map((preset) => ({
      ...preset,
      params: applyTaste(preset.params, taste),
    }));
  }, [mood, vector, likedGenres, genres, taste]);

  const openCollection = (preset: CollectionPreset) =>
    router.push(`/collection/${preset.slug}` as never);

  /**
   * The strapline under the wordmark used to read "Your Movie Universe", which
   * is true of the app on anyone's phone. It now reports what this page is
   * actually tuned to and opens the control that changes it — the same square
   * inch, carrying information instead of decoration.
   */
  const strapline =
    mood === null
      ? "Set tonight's mood"
      : [
          `Tonight: ${MOOD_STOPS[mood]}`,
          ...likedGenres.slice(0, 2).map((genre) => genre.name),
        ].join(' · ');

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBar.clearance(insets.bottom) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            // iOS reads `tintColor`, Android reads `colors` and paints them on
            // `progressBackgroundColor`. Setting only one leaves the other
            // platform on its default grey.
            tintColor={colors.paper}
            colors={[colors.blood]}
            progressBackgroundColor={colors.paper}
          />
        }
      >
        {/* Masthead */}
        <View
          style={{
            paddingHorizontal: grid.screenPadding,
            paddingTop: 6,
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            {/* Plain `Text`, not `Display`, and the lighter Thunder cut.
                `Display` stamps a hard black copy of the string behind the
                front one; at 60pt that shadow filled the counters of the
                condensed face and pulled so much weight to the top of the page
                that the 10pt line under it stopped registering. The wordmark
                still leads on scale alone. */}
            <Text
              variant="displayXl"
              style={{ fontFamily: fontFamily.displayAlt, fontSize: 52 }}
            >
              CINEVERSE
            </Text>

            <PressableScale
              onPress={() => router.push('/mood' as never)}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={
                mood === null
                  ? "Set tonight's mood"
                  : `Tuned to ${MOOD_STOPS[mood]}. Change it`
              }
              // A 13pt line is a 13pt target. The slop is what makes this the
              // size of a thumb without the layout paying for it.
              hitSlop={{ top: 10, bottom: 14, left: 8, right: 24 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                marginTop: 2,
                paddingVertical: 4,
              }}
            >
              {/* Ivory, not blood. This line is the only personalisation
                  control on the screen and it was the palette's least legible
                  pair — 2.9:1 — at 10pt. The blood stays on the chevron, where
                  it marks the affordance without carrying the words. */}
              <Text variant="osd" color={colors.paper} numberOfLines={1} style={{ flexShrink: 1 }}>
                {strapline}
              </Text>
              <Ionicons name="chevron-forward" size={13} color={colors.blood} />
            </PressableScale>
          </View>

          {/* 44pt, the platform minimum for a touch target. It was 40 with no
              slop, which is the one control on this page a thumb could miss. */}
          <Pressable
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            hitSlop={8}
            style={{ marginTop: 8 }}
          >
            {user?.imageUrl ? (
              <Image
                source={{ uri: user.imageUrl }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: colors.paper,
                }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.blood,
                  borderWidth: 2,
                  borderColor: colors.paper,
                }}
              >
                <Ionicons name="person" size={20} color={colors.paper} />
              </View>
            )}
          </Pressable>
        </View>

        {/* Search and filters read as one control cluster: same paper fill,
            same black rule. Three separate outlined boxes competed with each
            other and with the search field they were meant to qualify. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: 10,
            paddingHorizontal: grid.screenPadding,
            marginTop: 14,
          }}
        >
          <SearchField
            placeholder="Search for a movie"
            onPress={() => router.push('/search')}
            style={{ flex: 1 }}
          />

          <PressableScale
            onPress={() => router.push('/filters' as never)}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel="Filters"
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 14,
              backgroundColor: colors.paper,
              borderRadius: radius.sm,
              borderWidth: 2,
              borderColor: colors.noir,
            }}
          >
            <Ionicons name="options-outline" size={19} color={colors.blood} />
          </PressableScale>
        </View>

        {/* The masthead and the search field stay up whatever happens — they
            are this device's, not the archive's. Everything below is content,
            so it is replaced wholesale rather than left to vanish section by
            section. */}
        {archiveDown ? (
          <ArchiveDown onRetry={onRefresh} />
        ) : (
          <>
            {/* Hides itself entirely until an episode is actually marked,
                rather than showing an empty rail. */}
            <ContinueWatchingSection />

            {/* Mood, learned genres, exploration — nothing generic. */}
            <View style={{ marginTop: 30, gap: 30 }}>
              {rails.map((preset) => (
                <PosterRow key={preset.slug} preset={preset} onSeeAll={openCollection} />
              ))}
            </View>

            {/* The end of a finished scroll is the highest-intent space on the
                page, and it used to hold a joke and nothing else. The joke
                stays — it is the one place the reel metaphor lands — but it now
                sits above the exit, because a user who has read the whole page
                without picking anything is exactly who the deck is for. */}
            <View style={{ marginTop: 40, alignItems: 'center', gap: 14 }}>
              <Text variant="osd" color={colors.paperMuted}>
                [ End of reel ]
              </Text>
              <Button
                label="Start swiping"
                variant="paper"
                full={false}
                onPress={() => router.push('/flicks')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

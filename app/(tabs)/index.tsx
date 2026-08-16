import { useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TicketCard } from "@/components/kino/TicketCard";
import { TornSection } from "@/components/kino/TornSection";
import { PosterCard } from "@/components/media/PosterCard";
import { PosterRow } from "@/components/media/PosterRow";
import { Button } from "@/components/ui/Button";
import { Display } from "@/components/ui/Display";
import { PressableScale } from "@/components/ui/PressableScale";
import { Screen } from "@/components/ui/Screen";
import { SearchField } from "@/components/ui/SearchField";
import { Text } from "@/components/ui/Text";

import { ContinueWatchingRow } from "@/components/media/ContinueWatchingRow";
import { MOOD_STOPS } from "@/components/media/MoodSlider";
import { backdropUrlOrPlaceholder } from "@/lib/api/tmdb/images";
import type { Title } from "@/lib/api/tmdb/types";
import { qk } from "@/lib/queries/keys";
import { useUpcomingMovies } from "@/lib/queries/movies";
import { useGenres } from "@/lib/queries/reference";
import { useTrendingMovies } from "@/lib/queries/trending";
import { useContinueWatching } from "@/lib/queries/tv";
import { applyTaste, passesTaste, tasteFromPrefs } from "@/lib/recommend/params";
import {
  PRESETS,
  genreRail,
  moodRail,
  personRail,
  type CollectionPreset,
} from "@/lib/recommend/presets";
import { selectByFacet, usePrefs } from "@/lib/store/prefs";
import { colors, grid, radius, tabBar } from "@/theme/tokens";

/**
 * How many rails the page is allowed, counting the trending one.
 *
 * Past roughly this many the screen stops being a selection and becomes a
 * catalogue — every rail looks like the one above it and the personal ones stop
 * standing out, which is the whole reason they are there. Anyone who wants to
 * keep going has the deck, search, and a "see all" on every rail.
 */
const MAX_RAILS = 6;

/**
 * Caps per source, so one very opinionated user cannot spend the whole budget on
 * genres and leave no room for the rest.
 */
const MAX_GENRE_RAILS = 2;
const MAX_PERSON_RAILS = 1;

/**
 * Backfill, in the order it is spent. `PRESETS.popular` is deliberately absent:
 * "What everyone is watching" and the trending rail are the same list under two
 * headings.
 */
const GENERIC_RAILS = [PRESETS.acclaimed, PRESETS.thisYear, PRESETS.shortWatch];

/**
 * The premiere ticket's tear line has to fall in the gap between the title
 * block and the date block, and `TicketCard` places it at a fixed offset from
 * the card's top. Deriving that offset from these three numbers — rather than
 * letting the card guess at 66% of its own height — is what keeps the tear off
 * the type when a title wraps to one line instead of two.
 */
const TICKET_PAD = 14;
const TICKET_TITLE_BLOCK = 56;
const TICKET_TEAR_Y = TICKET_PAD + TICKET_TITLE_BLOCK + 12;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Formatted by hand rather than through `toLocaleDateString`. A stub is printed
 * matter, so the date wants one fixed shape across every device — and this
 * avoids depending on the Intl data being present in the JS engine at all.
 *
 * The ISO string is sliced rather than parsed: `new Date('2026-09-12')` is UTC
 * midnight, which renders as the 11th anywhere west of Greenwich.
 */
function formatStubDate(iso: string | null): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!match) return null;

  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  return name ? `${day} ${name} ${year}` : null;
}

/**
 * Section headings use `Text`, not `Display`.
 *
 * The hard offset shadow is the loudest device in the type system, and it only
 * reads as emphasis while it stays rare. Spending it on every rail heading —
 * five or six per scroll — flattened the page into one continuous shout. It is
 * now reserved for the masthead and the premiere, the two things that anchor.
 */
function SectionHeading({ title, caption }: { title: string; caption?: string }) {
  return (
    <View style={{ paddingHorizontal: grid.screenPadding }}>
      <Text variant="displaySm">{title}</Text>
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
 * The one feature block on the page: the next film into cinemas, in a paper
 * frame, with its own ticket stub torn out beneath it.
 *
 * This is the only red band on the screen. There were two — a decorative
 * welcome marquee and the trending rail — and neither carried anything the
 * other did not. A single band is an accent; a second one makes it a pattern
 * and the eye stops reading either as important.
 */
function PremiereHero({ hero }: { hero: Title }) {
  const router = useRouter();

  const released = formatStubDate(hero.date);

  return (
    <TornSection
      background={colors.blood}
      seed={11}
      style={{ marginTop: 22 }}
      contentStyle={{ paddingTop: 12, paddingBottom: 20 }}
    >
      <View style={{ paddingHorizontal: grid.screenPadding, gap: 14 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text variant="osd" color={colors.paper}>
            In cinemas soon
          </Text>

          {/* An ivory pill rather than ivory text on the red band. Paper on
              blood measures 4.4:1 — under AA for anything at this size — and as
              bare text it was also the only tappable thing on the band with
              nothing to say so. Inverting it fixes both: ink on ivory is the
              page's strongest pair, and a filled pill reads as a button. */}
          <PressableScale
            onPress={() => router.push('/upcoming' as never)}
            scaleTo={0.96}
            accessibilityRole="link"
            accessibilityLabel="See all premieres"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              backgroundColor: colors.paper,
              borderRadius: radius.pill,
              paddingHorizontal: 12,
              paddingVertical: 5,
            }}
          >
            <Text variant="label" color={colors.ink}>
              All premieres
            </Text>
          </PressableScale>
        </View>

        <PressableScale
          onPress={() => router.push(`/movies/${hero.id}` as never)}
          scaleTo={0.98}
          accessibilityRole="link"
          accessibilityLabel={`${hero.title}, in cinemas soon`}
        >
          {/* Paper mount, as a poster sits in a lobby case. */}
          <View style={{ backgroundColor: colors.paper, padding: 6, borderRadius: radius.sm }}>
            <Image
              source={{ uri: backdropUrlOrPlaceholder(hero.backdropPath, 'w780') }}
              style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 2 }}
              contentFit="cover"
              transition={220}
              cachePolicy="memory-disk"
            />
          </View>

          {/* The notches are punched in the band colour, so the stub has to
              stay inside the band — straddling the torn edge would need two
              different fills in one circle. */}
          <TicketCard
            pageBackground={colors.blood}
            notchOffset={TICKET_TEAR_Y}
            style={{ marginTop: 12, paddingHorizontal: TICKET_PAD }}
          >
            {/* Fixed height, not `minHeight`: the tear sits at a constant
                offset, so a one-line title that let this block shrink would
                drop the dashed rule straight through the date below it. */}
            <View
              style={{
                height: TICKET_PAD + TICKET_TITLE_BLOCK,
                paddingTop: TICKET_PAD,
                justifyContent: 'center',
              }}
            >
              <Text variant="displaySm" color={colors.ink} numberOfLines={2}>
                {hero.title}
              </Text>
            </View>

            <View
              style={{
                marginTop: 24,
                paddingBottom: TICKET_PAD,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <Text variant="osd" color={colors.ink}>
                {released ?? 'Date to be announced'}
              </Text>
              <Text variant="osd" color={colors.blood}>
                Admit one
              </Text>
            </View>
          </TicketCard>
        </PressableScale>
      </View>
    </TornSection>
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

  const trendingQuery = useTrendingMovies();
  const upcomingQuery = useUpcomingMovies();
  const { data: trending } = trendingQuery;
  const { data: genres } = useGenres('movie');

  const taste = useMemo(() => tasteFromPrefs(entries), [entries]);

  /**
   * The most prominent thing on the page is the last place a rejected genre
   * should surface, and /movie/upcoming takes no filter parameters — so the
   * feature is the first premiere that survives the user's taste, not the first
   * premiere.
   *
   * Resolved here rather than inside `PremiereHero` so this screen owns the
   * upcoming query directly. That is what makes the two page-level signals
   * below possible: a component that hides itself cannot report that it failed.
   */
  const hero = useMemo(
    () => upcomingQuery.data?.find((title) => passesTaste(title, taste)),
    [upcomingQuery.data, taste]
  );

  /**
   * Both of the page's own requests failing is the honest test for "the archive
   * is unreachable".
   *
   * Not one of them: a single failure is a bad endpoint or an unlucky retry, and
   * the rest of the page is still worth showing. Both is a connection. The rails
   * are not consulted because each owns a private query — by the time one could
   * report anything it has already returned null.
   */
  const archiveDown = trendingQuery.isError && upcomingQuery.isError;

  const [refreshing, setRefreshing] = useState(false);

  /**
   * Two invalidations, not one: `qk.trending()` is rooted at `['appwrite']`
   * while everything else on this page hangs off `qk.all` (`['tmdb']`), so a
   * single call would silently leave the trending rail stale.
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.all }),
        queryClient.invalidateQueries({ queryKey: qk.trending() }),
      ]);
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
   * Rails are data. The mood rail leads, then the user's own genres and cast,
   * and the named presets only fill whatever room is left.
   *
   * The generic ones thin out as real taste arrives, because they are backfill
   * and nothing more: they exist so a brand-new account does not land on an
   * empty page. Once there are rails built from what this person actually
   * chose, more rails built from nothing are the padding that made the screen
   * feel like everybody else's.
   */
  const { personalRails, genericRails } = useMemo(() => {
    const personal: CollectionPreset[] = [];

    const tonight = moodRail(mood);
    if (tonight) personal.push(tonight);

    for (const genre of likedGenres.slice(0, MAX_GENRE_RAILS)) {
      personal.push(genreRail(genre.id, genre.name));
    }

    const likedPeople = selectByFacet(entries, 'person', 'like');
    for (const entry of likedPeople.slice(0, MAX_PERSON_RAILS)) {
      if (entry.label) personal.push(personRail(Number(entry.value), entry.label));
    }

    // Trending always renders between the two groups, so it takes a slot.
    const remaining = Math.max(1, MAX_RAILS - personal.length - 1);

    const withTaste = (preset: CollectionPreset): CollectionPreset => ({
      ...preset,
      params: applyTaste(preset.params, taste),
    });

    return {
      personalRails: personal.map(withTaste),
      genericRails: GENERIC_RAILS.slice(0, remaining).map(withTaste),
    };
  }, [entries, likedGenres, mood, taste]);

  const trendingTitles = useMemo(
    () => (trending ?? []).filter((title) => passesTaste(title, taste)).slice(0, 12),
    [trending, taste]
  );

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
            <Display variant="displayXl">CINEVERSE</Display>

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
            {hero ? <PremiereHero hero={hero} /> : null}

            {/* Hides itself entirely until an episode is actually marked,
                rather than showing an empty rail. */}
            <ContinueWatchingSection />

            {/* What this person chose, before what everyone gets. */}
            <View style={{ marginTop: 30, gap: 30 }}>
              {personalRails.map((preset) => (
                <PosterRow key={preset.slug} preset={preset} onSeeAll={openCollection} />
              ))}
            </View>

            {/* Trending sits on the ground with the other rails now. The rank
                badges are what make it a chart; wrapping every poster in a
                tilted polaroid on a second red band was three treatments doing
                the job of one — and the polaroid's paper mount matched
                `PosterCard`'s own, so each card's title and year rendered ivory
                on ivory and vanished. */}
            {trendingTitles.length > 0 ? (
              <View style={{ marginTop: 30, gap: 12 }}>
                <SectionHeading
                  title="Top trending"
                  caption="Most watched across the archive today"
                />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  contentContainerStyle={{
                    paddingHorizontal: grid.screenPadding,
                    paddingTop: 6,
                    gap: 12,
                  }}
                >
                  {trendingTitles.map((title, index) => (
                    <PosterCard
                      key={title.id}
                      title={title}
                      rank={index + 1}
                      style={{ width: 124 }}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={{ marginTop: 30, gap: 30 }}>
              {genericRails.map((preset) => (
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
                onPress={() => router.push('/filmder')}
              />
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

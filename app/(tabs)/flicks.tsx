import { AboutSheet, type AboutSheetHandle } from '@/components/filmder/AboutSheet';
import { DeckCard } from '@/components/filmder/DeckCard';
import { DeckTicket, TICKET_MARGIN } from '@/components/filmder/DeckTicket';
import {
  SwipeDeck,
  type SwipeDeckHandle,
  type VerdictSource,
} from '@/components/filmder/SwipeDeck';
import { VerdictButtons } from '@/components/filmder/VerdictButtons';
import { MOOD_STOPS } from '@/lib/recommend/moods';
import { Button } from '@/components/ui/Button';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { backdropUrlOrPlaceholder } from '@/lib/api/tmdb/images';
import type { Title } from '@/lib/api/tmdb/types';
import { useDeck } from '@/lib/queries/deck';
import { usePrefs } from '@/lib/store/prefs';
import { colors, grid, radius, tabBar } from '@/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** How many upcoming stills to warm the image cache with. */
const PREFETCH_AHEAD = 5;

/** Side of one thumb key. The layout below measures against it. */
const VERDICT_SIZE = 76;

/** Clearance below the band — aligning it just above the AboutSheet's collapsed height */
const bandClearance = (inset: number) => inset + 22;

/** The "Seen it already?" caption beneath the keys, plus its gap. */
const CAPTION_BAND = 24;

/**
 * How far the keys ride up over the ticket's bottom edge, so the pair reads as
 * attached to the card rather than floating beneath it. Half the key, so the
 * ticket's edge runs through their centres.
 */
const BUTTON_OVERLAP = VERDICT_SIZE / 8;

/**
 * Which of the deck's four outcomes an input means.
 *
 * The whole product decision lives in this one map, and it is split by INPUT so
 * that no mode ever has to be switched: a drag is about a film the user has not
 * seen (pass it, or file it in the vault), while the thumb keys are about one
 * they have (it landed, or it did not). Four outcomes, two gestures, zero state.
 *
 * Only the vault verdict saves. Marking a film watched must never add it to a
 * list of films to go and watch.
 */
const OUTCOMES: Record<
  VerdictSource,
  Record<'left' | 'right', { verdict: 'up' | 'down'; seen: boolean }>
> = {
  gesture: {
    left: { verdict: 'down', seen: false }, // Pass
    right: { verdict: 'up', seen: false },  // Vault
  },
  button: {
    left: { verdict: 'down', seen: true },  // Watched, disliked
    right: { verdict: 'up', seen: true },   // Watched, liked
  },
};

const BackgroundPattern = () => {
  const line = 'RATE THE MOVIE TO THE FILM VOTE TO THE MOVIE RATE THE MOVIE TO THE FILM VOTE TO THE MOVIE RATE THE MOVIE ';
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', opacity: 0.05, transform: [{ rotate: '-12deg' }, { scale: 1.5 }], alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
      {Array.from({ length: 30 }).map((_, i) => (
        <Text key={i} variant="displayXl" color={colors.paper} style={{ fontSize: 28, lineHeight: 32, opacity: i % 2 === 0 ? 1 : 0.5 }} numberOfLines={1}>
          {line.repeat(2)}
        </Text>
      ))}
    </View>
  );
};

export default function FilmderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const deckRef = useRef<SwipeDeckHandle>(null);

  // Mood is a real filter on the deck, not a UI toggle: it changes the params
  // hash, which is the deck query's cache key, so changing it rebuilds the deck.
  const mood = usePrefs((state) => state.mood);
  const setMood = usePrefs((state) => state.setMood);
  const { cards, wildIds, isLoading, isError, isRefilling, isExhausted, retry, commit } =
    useDeck(mood);

  // Warm the next few stills at w780 — `original` backdrops run 2-4 MB each and
  // would eat a mobile data plan within a hundred swipes.
  useEffect(() => {
    const urls = cards
      .slice(1, 1 + PREFETCH_AHEAD)
      .map((card) => backdropUrlOrPlaceholder(card.backdropPath ?? card.posterPath, 'w780'));
    if (urls.length) Image.prefetch(urls, { cachePolicy: 'memory-disk' });
  }, [cards]);

  const top = cards[0];

  const handleVerdict = useCallback(
    (title: Title, direction: 'left' | 'right', source: VerdictSource) => {
      commit(title, OUTCOMES[source][direction]);
    },
    [commit]
  );

  /**
   * Opens the About sheet. Deliberately NOT a verdict — browsing a synopsis
   * must never record a judgement the user did not make.
   *
   * Object form rather than a template string: it types cleanly against the
   * generated route table, where `/movies/${id}` still needs an `as never`.
   */
  const sheetRef = useRef<AboutSheetHandle>(null);

  const openAbout = useCallback(() => {
    if (!top) return;
    sheetRef.current?.open();
  }, [top]);

  const showDeck =
    !isLoading && !isError && !isRefilling && !isExhausted && !!top;
  const bottomInset = tabBar.clearance(insets.bottom);

  return (
    <Screen edges={['top']} background={colors.inkDeep}>
      <BackgroundPattern />

      {/* Shown only while a mood is actually filtering the deck, and absolutely
          positioned so it costs the card no height. A filter you cannot see
          reads as a broken deck; a chip you cannot dismiss reads as a stuck
          one. With no mood set — the default — the screen is the marquee and
          the card, exactly as designed. */}
      {mood !== null ? (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: grid.screenPadding,
            zIndex: 5,
            alignItems: 'flex-end',
          }}
        >
          <PressableScale
            onPress={() => setMood(null)}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel={`Mood: ${MOOD_STOPS[mood]}. Clear it`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              backgroundColor: colors.blood,
              borderRadius: radius.pill,
              borderWidth: 2,
              borderColor: colors.noir,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <Text variant="label" color={colors.paper}>
              {MOOD_STOPS[mood]}
            </Text>
            <Ionicons name="close" size={13} color={colors.paper} />
          </PressableScale>
        </View>
      ) : null}

      <View
        style={{
          flex: 1,
          paddingHorizontal: showDeck ? TICKET_MARGIN : grid.screenPadding,
          paddingTop: showDeck ? 8 : 0,
        }}
      >
        {isLoading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.blood} />
          </View>
        ) : isError ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Display variant="displaySm" align="center">Projector jammed</Display>
            <Text
              variant="body"
              color={colors.paperMuted}
              style={{ textAlign: 'center' }}
            >
              Couldn&apos;t reach the archive.
            </Text>
            {/* The way out. Without it this screen was terminal: nothing
                retried on its own and no other control on the tab rebuilt the
                deck, so a single failed load ended the session. */}
            <Button label="Try again" variant="paper" full={false} onPress={retry} />
          </View>
        ) : isRefilling ? (
          // Out of cards but a probe still has pages left. Distinct from the
          // exhausted screen below, which used to catch this case and tell
          // people they had finished a deck that was merely mid-fetch.
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color={colors.blood} />
          </View>
        ) : !showDeck ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Ionicons name="film-outline" size={48} color={colors.blood} />
            <Display variant="displaySm" align="center">That&apos;s the whole reel</Display>
            <Text
              variant="body"
              color={colors.paperMuted}
              style={{ textAlign: 'center', paddingHorizontal: 20 }}
            >
              You&apos;ve been through everything matching your taste. Widen your
              preferences to see more.
            </Text>
            <Button
              label="Edit preferences"
              full={false}
              onPress={() => router.push('/profile')}
            />
          </View>
        ) : (
          <SwipeDeck
            ref={deckRef}
            cards={cards}
            onVerdict={handleVerdict}
            onSwipeUp={openAbout}
            renderCard={(card, isTop) => (
              <DeckTicket title={card.title}>
                <DeckCard
                  title={card}
                  isTop={isTop}
                  onPress={() => router.push(`/movies/${card.id}` as never)}
                />
                {/* Exploration cards say so. Every 4th card is deliberately
                    off-taste to keep the deck from converging on one genre
                    cluster, and pretending it was a confident pick would make
                    the misses read as the app being bad at its job.

                    Bottom-left, on the same baseline as the score star in the
                    opposite corner: both are marks ABOUT the film rather than
                    part of it, so they belong on the same line. The top of the
                    card is the metadata chip row and already full. */}
                {wildIds.has(card.id) ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      left: 12,
                      bottom: 21,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: colors.paper,
                      borderRadius: radius.pill,
                      borderWidth: 2,
                      borderColor: colors.noir,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Ionicons name="shuffle" size={12} color={colors.blood} />
                    <Text variant="label" color={colors.blood}>
                      Wildcard
                    </Text>
                  </View>
                ) : null}
              </DeckTicket>
            )}
          />
        )}
      </View>

      {/* Reserves the band's height so the ticket stops above it rather than
          running underneath. */}
      <View
        style={{
          height:
            VERDICT_SIZE - BUTTON_OVERLAP + CAPTION_BAND + bandClearance(bottomInset),
        }}
      />

      {showDeck ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: bandClearance(bottomInset),
            alignItems: 'center',
            gap: 8,
            zIndex: 20,
          }}
        >
          {/* The seen axis, always on screen, riding over the ticket's bottom
              edge where the keys have always sat.

              These are NOT a duplicate of the swipe: the drag records an intent
              about a film you have not watched (pass it, or vault it), while a
              thumb rates one you have. Two different questions, so both stay
              reachable at once — an earlier version hid the thumbs behind a
              toggle and made the user tap twice to answer a question the screen
              was already asking.

              The caption sits UNDER the keys, not over them: it labels what the
              two thumbs mean, and a label reads as belonging to the control
              above it once the control is the thing your thumb lands on first. */}
          <VerdictButtons
            size={VERDICT_SIZE}
            mode="taste"
            onDown={() => deckRef.current?.swipe('left', 'button')}
            onUp={() => deckRef.current?.swipe('right', 'button')}
          />

          <Text variant="label" color={colors.paperMuted}>
            Seen it already?
          </Text>
        </View>
      ) : null}

      {/* The AboutSheet that sits at the bottom mimicking the torn edge when collapsed */}
      {showDeck ? (
        <AboutSheet ref={sheetRef} movieId={top.id} visibleHeight={bottomInset + 16} />
      ) : null}
    </Screen>
  );
}

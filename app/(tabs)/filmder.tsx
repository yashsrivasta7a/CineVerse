import { AboutSheet, type AboutSheetHandle } from '@/components/filmder/AboutSheet';
import { DeckCard } from '@/components/filmder/DeckCard';
import { DeckTicket, TICKET_MARGIN } from '@/components/filmder/DeckTicket';
import { SwipeDeck, type SwipeDeckHandle } from '@/components/filmder/SwipeDeck';
import VerdictButtons from '@/components/filmder/VerdictButtons';
import { MOOD_STOPS } from '@/components/media/MoodSlider';
import { Button } from '@/components/ui/Button';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { backdropUrlOrPlaceholder } from '@/lib/api/tmdb/images';
import type { Title } from '@/lib/api/tmdb/types';
import { useDeck } from '@/lib/queries/deck';
import { usePrefs } from '@/lib/store/prefs';
import { colors, grid, radius, tabBar, withAlpha } from '@/theme/tokens';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** How many upcoming stills to warm the image cache with. */
const PREFETCH_AHEAD = 5;

/** Side of one verdict key. Held here because the layout below measures against it. */
const VERDICT_SIZE = 76;

/**
 * How far the verdict keys ride up over the ticket's bottom edge.
 *
 * Half the key, so the ticket's edge runs straight through their centres. This
 * is the only number to touch to move them: raising it lifts the keys and
 * shortens the ticket by the same amount, so the two stay locked together.
 */
const BUTTON_OVERLAP = VERDICT_SIZE / 8;

/** Clearance below the keys — aligning them just above the AboutSheet's collapsed height */
const bandClearance = (inset: number) => inset + 24;

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
  const { cards, isLoading, isError, isExhausted, commit } = useDeck(mood);

  // Warm the next few stills at w780 — `original` backdrops run 2-4 MB each and
  // would eat a mobile data plan within a hundred swipes.
  useEffect(() => {
    const urls = cards
      .slice(1, 1 + PREFETCH_AHEAD)
      .map((card) => backdropUrlOrPlaceholder(card.backdropPath ?? card.posterPath, 'w780'));
    if (urls.length) Image.prefetch(urls, { cachePolicy: 'memory-disk' });
  }, [cards]);

  const handleVerdict = useCallback(
    (title: Title, direction: 'left' | 'right') => {
      commit(title, direction === 'right' ? 'up' : 'down');
    },
    [commit]
  );

  const top = cards[0];

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

  const showDeck = !isLoading && !isError && !isExhausted && !!top;
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
              color={withAlpha(colors.paper, 0.7)}
              style={{ textAlign: 'center' }}
            >
              Couldn&apos;t reach the archive. Try again in a moment.
            </Text>
          </View>
        ) : !showDeck ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <Ionicons name="film-outline" size={48} color={colors.blood} />
            <Display variant="displaySm" align="center">That&apos;s the whole reel</Display>
            <Text
              variant="body"
              color={withAlpha(colors.paper, 0.7)}
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
              </DeckTicket>
            )}
          />
        )}
      </View>

      <View style={{ height: VERDICT_SIZE - BUTTON_OVERLAP + bandClearance(bottomInset) }} />

      {showDeck ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: bandClearance(bottomInset),
            alignItems: 'center',
            zIndex: 20,
          }}
        >

          <VerdictButtons
            size={VERDICT_SIZE}
            onDown={() => deckRef.current?.swipe('left')}
            onUp={() => deckRef.current?.swipe('right')}
          />

        </View>
      ) : null}

      {/* The AboutSheet that sits at the bottom mimicking the torn edge when collapsed */}
      {showDeck ? (
        <AboutSheet ref={sheetRef} movieId={top.id} visibleHeight={bottomInset + 16} />
      ) : null}
    </Screen>
  );
}

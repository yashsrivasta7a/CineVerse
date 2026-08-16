import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilmStrip } from '@/components/kino/FilmStrip';
import { TornEdge } from '@/components/kino/TornEdge';
import { VideoRow } from '@/components/media/VideoRow';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMovieDetails } from '@/lib/queries/movies';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

/**
 * The ABOUT FILM panel: a torn sheet of red paper dragged up over the deck.
 *
 * A ROUTE, not an overlay inside the Filmder screen. That is forced, not
 * preferred: `BottomTabView` renders its `tabBarElement` AFTER the screen
 * container, so nothing rendered inside a tab screen can ever paint over the
 * floating tab bar — no zIndex crosses that boundary, and the bar also carries
 * `elevation: 14`. A root-stack `transparentModal` is a sibling of the whole
 * `(tabs)` subtree, so it is unconditionally above it, and Android's hardware
 * back works for free.
 */

const SHEET_SPRING = { damping: 24, stiffness: 210, mass: 0.9 } as const;
const CLOSE_TIMING = { duration: 190 } as const;
const INSTANT = { duration: 0 } as const;

const BACKDROP_OPACITY = 0.62;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 850;
const TEAR_HEIGHT = 26;
const TEAR_TEETH = 13;
const SHEET_RATIO = 0.78;
/** Lines of synopsis shown before "See more". */
const COLLAPSED_LINES = 6;

/**
 * Precomputed on the JS thread. `withAlpha` is an ordinary function and the
 * animated-style bodies below run on the UI runtime, where calling it throws
 * "tried to synchronously call a non-worklet function".
 */
const RULE = withAlpha(colors.paper, 0.55);
const BODY = withAlpha(colors.paper, 0.93);

/**
 * Every worklet takes its shared values as parameters — the SwipeDeck pattern.
 * Nothing closes over the component body, so nothing the React Compiler treats
 * as effect-bound is ever written from a gesture handler.
 */

/** Runs the entrance. Called from an effect, never during render. */
function runOpen(openness: SharedValue<number>) {
  'worklet';
  openness.value = withSpring(1, SHEET_SPRING);
}

/**
 * Runs the exit, then pops the route once it has actually finished — so the
 * screen never unmounts mid-slide.
 */
function runClose(
  openness: SharedValue<number>,
  reduced: boolean,
  onDone: () => void
) {
  'worklet';
  openness.value = withTiming(
    0,
    reduced ? INSTANT : CLOSE_TIMING,
    (finished) => {
      if (finished) runOnJS(onDone)();
    }
  );
}

/** Downward is 1:1; upward rubber-bands so the sheet cannot be hauled past open. */
function runSheetDrag(drag: SharedValue<number>, y: number) {
  'worklet';
  drag.value = y > 0 ? y : y * 0.18;
}

/** The drag did not pass the dismiss threshold — settle back to open. */
function runSheetSettle(drag: SharedValue<number>) {
  'worklet';
  drag.value = withSpring(0, SHEET_SPRING);
}

/**
 * Commits the dismissal. `drag` unwinds over the same duration the exit takes,
 * so the composed translateY stays continuous rather than jumping back by
 * however far the finger had already travelled.
 */
function runSheetDismiss(drag: SharedValue<number>, requestClose: () => void) {
  'worklet';
  drag.value = withTiming(0, CLOSE_TIMING);
  runOnJS(requestClose)();
}

export default function AboutFilmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const movieId = Number(id);
  const { data: movie, isPending } = useMovieDetails(
    Number.isFinite(movieId) ? movieId : undefined
  );

  const sheetHeight = Math.round(height * SHEET_RATIO);

  const [expanded, setExpanded] = useState(false);

  /**
   * Two shared values, split by who writes them.
   *
   * `openness` is the entrance/exit, written only by `runOpen`/`runClose`.
   * `drag` is the finger, written only by the pan. `useAnimatedStyle` composes
   * them, so no single value is written from two places — which is what keeps a
   * gesture-writable value clear of anything the compiler treats as
   * effect-bound.
   *
   * It starts at 0 and is animated up from an effect rather than being seeded
   * with an animation: a shared value initialised to `withSpring(1)` has no 0
   * to travel from and the panel would appear already open. React state is
   * deliberately NOT used for this — `setState` inside an effect is a cascading
   * render, and the compiler's set-state-in-effect rule rejects it.
   */
  const openness = useSharedValue(0);
  const drag = useSharedValue(0);

  const finish = useCallback(() => router.back(), [router]);

  useEffect(() => {
    runOpen(openness);
  }, [openness]);

  // A plain function, not useCallback: memoising it would put `openness` in a
  // dependency array, and a shared value that is both a hook dependency and a
  // mutation target is exactly what react-hooks/immutability rejects.
  const dismiss = () => runClose(openness, reduceMotion, finish);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - openness.value) * sheetHeight + drag.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => {
    const pulled = drag.value > 0 ? drag.value / sheetHeight : 0;
    return { opacity: openness.value * (1 - pulled) * BACKDROP_OPACITY };
  });

  /**
   * Attached to the header block only. The body is a ScrollView, and a pan over
   * it would need simultaneous-gesture wiring plus a scrolled-to-top check. A
   * dedicated drag header is one fewer moving part, and the grabber advertises
   * it.
   */
  const dragToDismiss = Gesture.Pan()
    .activeOffsetY(8)
    .failOffsetY(-8)
    .onUpdate((event) => {
      runSheetDrag(drag, event.translationY);
    })
    .onEnd((event) => {
      if (
        event.translationY > DISMISS_DISTANCE ||
        event.velocityY > DISMISS_VELOCITY
      ) {
        runSheetDismiss(drag, dismiss);
      } else {
        runSheetSettle(drag);
      }
    });

  /**
   * Hardware back already pops the route; this only buys the exit animation.
   * RN dispatches back subscriptions newest-first and stops at the first
   * `true`, and this screen mounts after the navigator, so it wins.
   */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      runClose(openness, reduceMotion, finish);
      return true;
    });
    return () => sub.remove();
  }, [openness, reduceMotion, finish]);

  const overview = movie?.overview?.trim();
  const videos = movie?.videos?.results ?? [];

  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      {/* Opacity animates over a static noir fill — no colour is ever computed
          on the UI runtime. */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.noir }, backdropStyle]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Close about film"
        />
      </Animated.View>

      <Animated.View
        style={[{ height: sheetHeight }, sheetStyle]}
        // iOS: keeps VoiceOver inside the sheet. Android is already covered —
        // expo-router marks the screen below aria-hidden while unfocused.
        accessibilityViewIsModal
      >
        <GestureDetector gesture={dragToDismiss}>
          <View>
            {/* The rip. Unflipped TornEdge puts the solid fill at the BOTTOM
                and the teeth pointing UP, which is exactly the top edge of a
                solid block — verified by tracing the path, not by the prop
                name. Nothing above it has a background, so the deck shows
                through between the teeth. */}
            <TornEdge
              fill={colors.blood}
              height={TEAR_HEIGHT}
              seed={13}
              teeth={TEAR_TEETH}
            />

            <View
              style={{
                backgroundColor: colors.blood,
                // Overlaps the tear by a hair: the generated valleys can reach
                // the full band height, leaving sub-pixel slivers of solid that
                // would otherwise read as a seam.
                marginTop: -1,
                paddingHorizontal: grid.screenPadding,
                paddingTop: 6,
                paddingBottom: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                  top: 10,
                }}
              >
                <View
                  style={{
                    width: 46,
                    height: 4,
                    borderRadius: radius.pill,
                    backgroundColor: RULE,
                  }}
                />
              </View>

              {/* The visible close affordance. A gesture-only dismiss is
                  unusable with a screen reader. */}
              <PressableScale
                onPress={dismiss}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel="Close about film"
                hitSlop={10}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: colors.noir,
                }}
              >
                <Ionicons name="close" size={19} color={colors.paper} />
              </PressableScale>
            </View>
          </View>
        </GestureDetector>

        <ScrollView
          style={{ flex: 1, backgroundColor: colors.blood }}
          contentContainerStyle={{
            paddingHorizontal: grid.screenPadding,
            paddingTop: 8,
            paddingBottom: insets.bottom + 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: 2, width: 62, backgroundColor: RULE, marginBottom: 12 }} />

          <Display variant="display" color={colors.paper} shadowColor={colors.noir}>
            About film
          </Display>

          <Text
            variant="body"
            color={BODY}
            numberOfLines={expanded ? undefined : COLLAPSED_LINES}
            style={{ marginTop: 12, lineHeight: 22 }}
          >
            {overview || (isPending ? 'Loading…' : 'No synopsis on file for this one.')}
          </Text>

          {overview ? (
            <PressableScale
              onPress={() => setExpanded((value) => !value)}
              scaleTo={0.96}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Show less' : 'Show the full synopsis'}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: colors.noir,
                borderRadius: radius.pill,
                paddingHorizontal: 20,
                paddingVertical: 10,
                marginTop: 16,
              }}
            >
              <Text variant="label" color={colors.paper}>
                {expanded ? 'See less' : 'See more'}
              </Text>
            </PressableScale>
          ) : null}

          {videos.length ? (
            <View style={{ marginTop: 28 }}>
              <FilmStrip height={16} pitch={20} stripColor={colors.noir} />

              {/*
                The mockup labels this slot "BLOGGERS". TMDB has no blogger
                corpus, and no other field in the payload is blogger-shaped —
                credits are cast and crew, recommendations are other films,
                watch/providers are streaming services. Rather than invent
                bylines, the slot carries the real thing that is actually
                there: the film's own trailers and featurettes.
              */}
              <Display
                variant="displaySm"
                color={colors.paper}
                shadowColor={colors.noir}
                style={{ marginTop: 18 }}
              >
                On video
              </Display>

              <View style={{ marginTop: 10 }}>
                <VideoRow videos={videos} />
              </View>
            </View>
          ) : null}

          <PressableScale
            onPress={() =>
              router.replace({
                pathname: '/movies/[id]',
                params: { id: String(movieId) },
              })
            }
            scaleTo={0.97}
            accessibilityRole="link"
            accessibilityLabel={`Open the full record for ${movie?.title ?? 'this film'}`}
            style={{
              alignSelf: 'center',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 7,
              borderRadius: radius.pill,
              borderWidth: 2,
              borderColor: colors.noir,
              paddingHorizontal: 18,
              paddingVertical: 9,
              marginTop: 30,
            }}
          >
            <Text variant="label" color={colors.noir}>
              Full record
            </Text>
            <Ionicons name="arrow-forward" size={13} color={colors.noir} />
          </PressableScale>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

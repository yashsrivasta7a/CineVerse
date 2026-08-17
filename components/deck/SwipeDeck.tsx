import * as Haptics from 'expo-haptics';
import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import type { Title } from '@/lib/api/tmdb/types';
import { colors, radius, withAlpha } from '@/theme/tokens';

export type SwipeDirection = 'left' | 'right';

/**
 * Which input produced a verdict.
 *
 * The deck deliberately does not know what these *mean* — that mapping lives on
 * the screen, which owns the product decision that a drag is about a film you
 * have not seen and a key is about one you have. All this layer guarantees is
 * that the two stay distinguishable all the way to the callback.
 */
export type VerdictSource = 'gesture' | 'button';

export interface SwipeDeckHandle {
  swipe: (direction: SwipeDirection, source?: VerdictSource) => void;
}

/**
 * What the drag stamps say.
 *
 * Fixed, because a drag only ever means one thing here: it is the unseen axis,
 * and the two words below are the two outcomes on it. The keys speak for the
 * seen axis and carry their own labels.
 */
const STAMP_LEFT = 'Pass';
const STAMP_RIGHT = 'Vault';

/**
 * The verdicts reachable without a drag, for assistive technology.
 *
 * A screen reader cannot pan, so the two swipe outcomes would otherwise be
 * unreachable — the keys only cover the seen axis. Exposing all four here keeps
 * one complete list in one place rather than making the user find half of the
 * verdicts on the card and half on the buttons.
 */
const A11Y_ACTIONS = [
  { name: 'pass', label: 'Pass' },
  { name: 'vault', label: 'Add to my vault' },
  { name: 'watchedLiked', label: 'Watched it, liked it' },
  { name: 'watchedDisliked', label: 'Watched it, did not like it' },
  // Grouping the card for the screen reader hides the pressable inside it, so
  // without this there is no way left to read the synopsis before judging.
  { name: 'about', label: 'More about this film' },
] as const;

export interface SwipeDeckProps {
  cards: Title[];
  onVerdict: (
    title: Title,
    direction: SwipeDirection,
    source: VerdictSource
  ) => void;
  /**
   * An upward drag on the top card. NOT a verdict — the card springs home and
   * the About-film sheet is opened instead, so browsing a synopsis never
   * silently records a judgement the user did not make.
   */
  onSwipeUp?: () => void;
  renderCard: (title: Title, isTop: boolean) => React.ReactNode;
}

const SPRING = { damping: 18, stiffness: 180 };
const FLING_MS = 220;
/** Cards kept mounted. Two behind the top one is all that is ever visible. */
const VISIBLE = 3;

/**
 * Resting transform of each slot behind the top one. Named because the slot
 * above's rest is the slot below's animation target — see `secondStyle`.
 */
const SECOND_SCALE = 0.94;
const SECOND_LIFT = 14;
const THIRD_SCALE = 0.88;
const THIRD_LIFT = 28;

/** Axis-lock states. Plain ints, so they cross to the UI runtime for free. */
const AXIS_NONE = 0;
const AXIS_SWIPE = 1;
const AXIS_UP = 2;

/**
 * Travel (dp) before a drag is classified as horizontal or upward.
 *
 * This is NOT dead travel. RNGH re-zeroes `translation` at the moment the
 * handler activates, so the platform slop is invisible here and the card keeps
 * tracking the finger while undecided — which lets this bar be generous enough
 * to read direction reliably.
 *
 * Deliberately NOT implemented with `activeOffsetX`/`failOffsetY`: setting any
 * of those flips RNGH's `hasCustomActivationCriteria`, which discards the
 * platform touch slop and changes when this pan steals the touch from the
 * gesture-handler Pressable inside DeckCard. Two pans composed with reciprocal
 * failOffsets is worse still — RNGH evaluates shouldFail() before
 * shouldActivate() on the same event, so one batched diagonal move can fail
 * BOTH handlers and freeze the card until the finger lifts.
 */
const AXIS_LOCK = 14;
/** How much more vertical than horizontal travel reads as "up", not "sideways". */
const AXIS_BIAS = 1.15;
/** Cap on how far the card rides up, so it hints rather than leaves. */
const LIFT_MAX = 80;
/** Per-frame decay unwinding the few dp of tx banked before the lock resolved. */
const LIFT_UNWIND = 0.75;
/** Fraction of screen height an upward drag must cover to open the sheet. */
const UP_RATIO = 0.13;
/** Upward flick that opens it regardless of distance (dp/s, negative is up). */
const UP_VELOCITY = -750;

/**
 * Throws the top card off screen, then recentres for the card behind it.
 *
 * Defined at module scope, taking the shared values as arguments, rather than
 * as a closure inside the component. `useImperativeHandle` is effect-like, so
 * anything it closes over is treated by the React Compiler as effect-bound —
 * and writing to an effect-bound value from a gesture handler is exactly what
 * its immutability rule rejects. Passing them in keeps every write outside the
 * component body.
 */
function runFling(
  tx: SharedValue<number>,
  ty: SharedValue<number>,
  axis: SharedValue<number>,
  width: number,
  direction: SwipeDirection,
  source: VerdictSource,
  onDone: (direction: SwipeDirection, source: VerdictSource) => void
) {
  'worklet';
  axis.value = AXIS_NONE;
  const sign = direction === 'right' ? 1 : -1;

  ty.value = withTiming(ty.value + 40, { duration: FLING_MS });
  tx.value = withTiming(sign * width * 1.5, { duration: FLING_MS }, (finished) => {
    if (!finished) return;
    // Deliberately does NOT recentre here.
    //
    // These shared values belong to the TOP SLOT, not to a card, and the slot
    // still holds the flung card until React has re-rendered. Zeroing them on
    // this callback dropped that card back into the middle of the screen for
    // every frame between the animation ending and the re-render committing —
    // which reads as the same film being dealt twice. The recentre now happens
    // in a layout effect keyed on the new top card's id, i.e. after the swap
    // and before the next paint.
    runOnJS(onDone)(direction, source);
  });
}

/** Snaps the card back when a drag did not pass the commit threshold. */
function runSnapBack(
  tx: SharedValue<number>,
  ty: SharedValue<number>,
  axis: SharedValue<number>
) {
  'worklet';
  axis.value = AXIS_NONE;
  tx.value = withSpring(0, SPRING);
  ty.value = withSpring(0, SPRING);
}

/** Releases the lock at the start of each drag. */
function runAxisReset(axis: SharedValue<number>) {
  'worklet';
  axis.value = AXIS_NONE;
}

/**
 * Springs the card home and hands off to JS to open the About sheet.
 *
 * The card returns to rest rather than flying away: it is still the current
 * card, and the sheet is about to slide up over it.
 */
function runRequestAbout(
  tx: SharedValue<number>,
  ty: SharedValue<number>,
  axis: SharedValue<number>,
  onRequest: () => void
) {
  'worklet';
  axis.value = AXIS_NONE;
  tx.value = withSpring(0, SPRING);
  ty.value = withSpring(0, SPRING);
  runOnJS(onRequest)();
}

/**
 * Tracks the drag while the finger is down, and decides which axis owns it.
 *
 * Until the lock resolves the card follows the finger exactly as it always did,
 * so classification costs no dead travel. Once it resolves upward the card
 * clamps to LIFT_MAX — continuous at the crossover, since |y| >= AXIS_LOCK <
 * LIFT_MAX there — and the banked horizontal offset decays away over a few
 * frames rather than snapping to zero.
 */
function runDrag(
  tx: SharedValue<number>,
  ty: SharedValue<number>,
  axis: SharedValue<number>,
  x: number,
  y: number
) {
  'worklet';
  if (axis.value === AXIS_NONE) {
    const ax = Math.abs(x);
    const ay = Math.abs(y);
    if (y < 0 && ay >= AXIS_LOCK && ay > ax * AXIS_BIAS) {
      axis.value = AXIS_UP;
    } else if (ax >= AXIS_LOCK || y > AXIS_LOCK) {
      // A downward drag locks to SWIPE too, so a gesture that starts downward
      // cannot flip into the sheet halfway through.
      axis.value = AXIS_SWIPE;
    }
  }

  if (axis.value === AXIS_UP) {
    ty.value = Math.min(0, Math.max(y, -LIFT_MAX));
    tx.value = tx.value * LIFT_UNWIND;
    return;
  }

  tx.value = x;
  ty.value = y;
}

const Stamp = ({ label, style }: { label: string; style: any }) => (
  <Animated.View
    pointerEvents="none"
    style={[
      {
        position: 'absolute',
        // Below the card's chip row, which runs to roughly y=41. At the old
        // top: 30 the stamps sat on top of it during every drag.
        top: 62,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderWidth: 3,
        borderRadius: radius.sm,
        borderColor: colors.paper,
        backgroundColor: withAlpha(colors.noir, 0.35),
        zIndex: 10,
      },
      style,
    ]}
  >
    <Text variant="label" color={colors.paper} style={{ fontSize: 16, letterSpacing: 2 }}>
      {label}
    </Text>
  </Animated.View>
);

/**
 * Tinder-style card deck.
 *
 * Hand-rolled on Gesture.Pan + Reanimated rather than a library: both are
 * already dependencies, and the alternatives are either PanResponder-era
 * (untested on the New Architecture) or thin enough that stamp overlays and
 * imperative button swipes would mean forking them anyway.
 *
 * The thumbs buttons drive this through the same shared values the gesture
 * does, via the imperative handle — one code path, so the accessible route
 * cannot drift from the gesture route.
 *
 * Note on structure: `tx`/`ty` deliberately appear in NO hook dependency array,
 * and `fling` is an ordinary function rather than a useCallback. The React
 * Compiler's immutability rule rejects mutating a value that is also listed as
 * a hook dependency, which is exactly what a memoized gesture handler over
 * shared values would be.
 */
export const SwipeDeck = forwardRef<SwipeDeckHandle, SwipeDeckProps>(
  function SwipeDeck({ cards, onVerdict, onSwipeUp, renderCard }, ref) {
    const { width, height } = useWindowDimensions();
    const tx = useSharedValue(0);
    const ty = useSharedValue(0);
    /** AXIS_NONE | AXIS_SWIPE | AXIS_UP for the drag in progress. */
    const axis = useSharedValue(AXIS_NONE);

    const top = cards[0];

    /**
     * Recentres the top slot whenever a different card moves into it.
     *
     * `useLayoutEffect`, not `useEffect`: it runs after the swap is committed
     * but BEFORE the frame is painted, so the incoming card is never drawn at
     * the outgoing card's off-screen offset. Doing this here rather than in the
     * fling callback is what stops the flung card being briefly redrawn at
     * centre — see the note in `runFling`.
     */
    useLayoutEffect(() => {
      tx.value = 0;
      ty.value = 0;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [top?.id]);

    const commit = useCallback(
      (direction: SwipeDirection, source: VerdictSource) => {
        if (!top) return;
        Haptics.impactAsync(
          direction === 'right'
            ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light
        );
        onVerdict(top, direction, source);
      },
      [top, onVerdict]
    );

    // Normalised here rather than inside the worklet: runOnJS(undefined) throws,
    // and the prop is optional.
    const requestAbout = useCallback(() => {
      onSwipeUp?.();
    }, [onSwipeUp]);

    useImperativeHandle(ref, () => ({
      swipe: (direction: SwipeDirection, source: VerdictSource = 'gesture') =>
        runFling(tx, ty, axis, width, direction, source, commit),
    }));

    /**
     * Runs a verdict from the screen reader's action menu.
     *
     * An ordinary function rather than a `useCallback` for the same reason
     * `fling` is: memoising it would list the shared values as hook
     * dependencies, which the React Compiler's immutability rule rejects for
     * values this then writes to.
     */
    const handleAccessibilityAction = (
      event: { nativeEvent: { actionName: string } }
    ) => {
      switch (event.nativeEvent.actionName) {
        case 'pass':
          return runFling(tx, ty, axis, width, 'left', 'gesture', commit);
        case 'vault':
          return runFling(tx, ty, axis, width, 'right', 'gesture', commit);
        case 'watchedDisliked':
          return runFling(tx, ty, axis, width, 'left', 'button', commit);
        case 'watchedLiked':
          return runFling(tx, ty, axis, width, 'right', 'button', commit);
        case 'about':
          return requestAbout();
      }
    };

    const pan = Gesture.Pan()
      .onStart(() => {
        runAxisReset(axis);
      })
      .onUpdate((event) => {
        runDrag(tx, ty, axis, event.translationX, event.translationY);
      })
      .onEnd((event, success) => {
        // `success` is false when an ACTIVE handler was CANCELLED. Without this,
        // a system gesture stealing the touch mid-swipe — the Android back-swipe
        // edge, an iOS notification pull — commits a verdict the user never gave.
        if (!success) return;

        if (axis.value === AXIS_UP) {
          const opened =
            event.translationY < -height * UP_RATIO ||
            event.velocityY < UP_VELOCITY;
          if (opened) {
            runRequestAbout(tx, ty, axis, requestAbout);
          } else {
            runSnapBack(tx, ty, axis);
          }
          return;
        }

        const passedDistance = Math.abs(tx.value) > width * 0.28;
        const passedVelocity = Math.abs(event.velocityX) > 800;

        if (passedDistance || passedVelocity) {
          // Fall back to the velocity's sign: on a velocity-only commit tx can
          // still be 0, which `tx.value > 0` alone read as a left swipe.
          const drift = tx.value !== 0 ? tx.value : event.velocityX;
          runFling(
            tx,
            ty,
            axis,
            width,
            drift > 0 ? 'right' : 'left',
            'gesture',
            commit
          );
        } else {
          runSnapBack(tx, ty, axis);
        }
      })
      .onFinalize((_event, success) => {
        // Fires for FAILED/CANCELLED whether or not the handler ever activated.
        // onEnd is skipped in the never-activated case, so this is the only
        // place a stranded card gets put back.
        if (!success) runSnapBack(tx, ty, axis);
      });

    const topStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: tx.value },
        { translateY: ty.value },
        {
          rotate: `${interpolate(
            tx.value,
            [-width, 0, width],
            [-12, 0, 12],
            Extrapolation.CLAMP
          )}deg`,
        },
        // Recedes as it rides up, so the card reads as passing behind the
        // rising sheet rather than off the top of the screen. A positive ty —
        // the fling's +40, or a downward drag — clamps to 1 and is unaffected.
        {
          scale: interpolate(
            ty.value,
            [-LIFT_MAX, 0],
            [0.93, 1],
            Extrapolation.CLAMP
          ),
        },
      ],
    }));

    const likeStyle = useAnimatedStyle(() => ({
      opacity: interpolate(tx.value, [0, width * 0.25], [0, 1], Extrapolation.CLAMP),
      transform: [{ rotate: '-12deg' }],
      left: 24,
    }));

    const nopeStyle = useAnimatedStyle(() => ({
      opacity: interpolate(tx.value, [0, -width * 0.25], [0, 1], Extrapolation.CLAMP),
      transform: [{ rotate: '12deg' }],
      right: 24,
    }));

    // The cards behind ease forward off the top card's progress rather than
    // running gesture maths of their own.
    const progress = useDerivedValue(() =>
      interpolate(Math.abs(tx.value), [0, width * 0.5], [0, 1], Extrapolation.CLAMP)
    );

    /**
     * The stack is a conveyor: at full progress each card must be sitting on
     * exactly the resting transform of the slot ABOVE it.
     *
     * That end-point is load-bearing, not styling. The second card used to stop
     * at scale 0.98 / translateY 7 and then become the top card, whose resting
     * transform is scale 1 / translateY 0 — so every swipe ended with the
     * incoming card jumping the last 2% in a single frame. Landing it on 1 and 0
     * means the promotion changes which style object drives the card without
     * changing a single number, and the swap is invisible.
     */
    const secondStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: interpolate(progress.value, [0, 1], [SECOND_SCALE, 1]) },
        { translateY: interpolate(progress.value, [0, 1], [SECOND_LIFT, 0]) },
      ],
    }));

    const thirdStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: interpolate(progress.value, [0, 1], [THIRD_SCALE, SECOND_SCALE]) },
        { translateY: interpolate(progress.value, [0, 1], [THIRD_LIFT, SECOND_LIFT]) },
      ],
    }));

    const stack = cards.slice(0, VISIBLE);

    /**
     * ONE detector, on a stable container — never one per card.
     *
     * Wrapping only the top card put every card through a changing element type
     * as it advanced: `<GestureDetector><Animated.View>` while on top, a bare
     * `<Animated.View>` behind. React cannot reconcile across a changed type, so
     * the card directly under the one being swiped was unmounted and rebuilt the
     * instant it was promoted — which showed as its poster blanking and fading
     * back in on every single swipe. Same key, same props, remounted anyway.
     *
     * The container covers exactly the area the cards do, so the pan still
     * begins anywhere on the deck, and the shared values it drives still only
     * transform the top card.
     */
    return (
      <GestureDetector gesture={pan}>
        <View style={{ flex: 1 }}>
          {stack
            .map((card, index) => {
              const isTop = index === 0;
              const style =
                index === 0 ? topStyle : index === 1 ? secondStyle : thirdStyle;

              return (
                <Animated.View
                  key={card.id}
                  // Only the top card carries the action menu. The two behind
                  // it are decoration, and offering verdicts on a card the user
                  // cannot see would let them judge the wrong film.
                  accessible={isTop}
                  // No explicit label: grouping lets the platform build the
                  // announcement from the card's own text — title, year,
                  // rating — which is strictly more than a title alone.
                  accessibilityActions={isTop ? [...A11Y_ACTIONS] : undefined}
                  onAccessibilityAction={
                    isTop ? handleAccessibilityAction : undefined
                  }
                  style={[
                    {
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: VISIBLE - index,
                    },
                    style,
                  ]}
                >
                  {renderCard(card, isTop)}

                  {isTop ? (
                    <>
                      <Stamp label={STAMP_RIGHT} style={likeStyle} />
                      <Stamp label={STAMP_LEFT} style={nopeStyle} />
                    </>
                  ) : null}
                </Animated.View>
              );
            })
            // Painter's order: the top card renders last so it sits above the
            // stack on Android, where zIndex alone is unreliable.
            .reverse()}
        </View>
      </GestureDetector>
    );
  }
);

export default SwipeDeck;

import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { colors, radius } from '@/theme/tokens';
import { fontFamily } from '@/theme/typography';

/** How long one flap takes to fall. */
const FLAP_MS = 260;
/** Gap between neighbouring flaps starting, which is what makes it read left-to-right. */
const STAGGER_MS = 55;

/**
 * Sharp out, soft in — a real flap is thrown by gravity and stopped by a
 * detent, so the motion is not symmetric.
 */
const FLAP_EASING = Easing.bezier(0.2, 0.9, 0.25, 1);

export interface SplitFlapProps {
  /** Rendered one character per cell. Compared as a whole to trigger the flip. */
  text: string;
  /** Cell width. Height is derived so the board keeps a board's proportions. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * One cell of the board.
 *
 * The outgoing character is not animated out. A real split-flap is only ever
 * showing one card at a time — the flap falls and the next face is already
 * behind it — so a fold-in on the incoming glyph is both truer to the object
 * and half the work of cross-fading two copies.
 */
function Flap({
  char,
  index,
  size,
  generation,
}: {
  char: string;
  index: number;
  size: number;
  generation: number;
}) {
  const fall = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      fall.value = 1;
      return;
    }
    fall.value = 0;
    fall.value = withDelay(
      index * STAGGER_MS,
      withTiming(1, { duration: FLAP_MS, easing: FLAP_EASING })
    );
    // `generation` rather than `char`: two stops can share a letter in the same
    // column ("GOOD" -> "GREAT" keeps the G), and a cell that does not re-run
    // its animation sits still while its neighbours flip, which reads as broken
    // hardware rather than as a board.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generation, reducedMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(fall.value, [0, 0.35, 1], [0, 0.6, 1]),
    transform: [
      { perspective: 420 },
      { rotateX: `${interpolate(fall.value, [0, 1], [-88, 0])}deg` },
      { translateY: interpolate(fall.value, [0, 1], [-size * 0.18, 0]) },
    ],
  }));

  return (
    <View
      style={{
        width: size,
        height: size * 1.32,
        borderRadius: radius.sm,
        backgroundColor: colors.noir,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Animated.View style={style}>
        <Text
          color={colors.paper}
          style={{
            fontFamily: fontFamily.display,
            fontSize: size * 1.06,
            lineHeight: size * 1.18,
            textAlign: 'center',
          }}
        >
          {char}
        </Text>
      </Animated.View>

      {/* The hinge. A split-flap's defining detail is the seam across the
          middle of the card, and without it these are just dark boxes. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: 1.5,
          backgroundColor: colors.ink,
        }}
        pointerEvents="none"
      />
    </View>
  );
}

/**
 * A Solari split-flap board.
 *
 * Chosen over a photographic control because this app's subject already owns
 * this object — it is the departure board of a picture house — and because it
 * needs no network, no assets, and no third-party images to say what it is.
 *
 * Cells are keyed by POSITION, not by character, so a letter shared between two
 * words does not skip its flip.
 */
export function SplitFlap({ text, size = 42, style }: SplitFlapProps) {
  const chars = text.split('');
  const reducedMotion = useReducedMotion();

  /**
   * Increments on every change, and is what each cell watches.
   *
   * Adjusted during render rather than in an effect: an effect would let one
   * frame paint the new word already at rest, and that frame is the flip. This
   * is the sanctioned render-phase state adjustment — React re-runs the
   * component immediately with the new values and never commits the first pass.
   */
  const [generation, setGeneration] = useState(0);
  const [previous, setPrevious] = useState(text);
  if (previous !== text) {
    setPrevious(text);
    setGeneration((n) => n + 1);
  }

  /**
   * One tick per flap, timed to the same stagger the animation uses, so the
   * board is felt landing left-to-right rather than as a single buzz.
   *
   * `selectionAsync` is the lightest of the three families — a detent, not an
   * impact, which is what a flap actually is. Timers are cleared on change so a
   * fast scrub cannot stack overlapping trains of them.
   */
  useEffect(() => {
    if (reducedMotion) return;

    const timers = chars.map((_, index) =>
      setTimeout(() => {
        Haptics.selectionAsync().catch(() => {});
      }, index * STAGGER_MS)
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, reducedMotion]);

  return (
    <View style={[{ flexDirection: 'row', gap: 5 }, style]} accessibilityLabel={text}>
      {chars.map((char, index) => (
        <Flap
          key={index}
          char={char}
          index={index}
          size={size}
          generation={generation}
        />
      ))}
    </View>
  );
}

export default SplitFlap;

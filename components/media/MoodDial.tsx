import * as Haptics from 'expo-haptics';
import React from 'react';
import { useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import { colors, radius } from '@/theme/tokens';
import { fontFamily } from '@/theme/typography';

/** Degrees between two stops on the rim. */
const STEP = 26;

/** How much of the knob rises above the bottom edge. */
const PEEK = 168;

/** Knob width as a multiple of the screen, so the visible arc stays shallow. */
const WIDTH_RATIO = 1.75;

/** Distance from the knob's edge down to the tick marks and to the labels. */
const TICK_INSET = 12;
const LABEL_INSET = 34;

const SNAP = { damping: 18, stiffness: 210, mass: 0.6 } as const;

export interface MoodDialProps {
  value: number;
  onChange: (value: number) => void;
  /** Labels for the detents, in order. Length defines the number of stops. */
  stops: readonly string[];
  style?: StyleProp<ViewStyle>;
}

/**
 * The mood, as a rotary knob sunk into the bottom of the screen.
 *
 * Only the top cap of the dial is above the edge, the way a timer knob sits in
 * an appliance's fascia — so the control reads as a physical part of the device
 * rather than a widget drawn on it, and the whole upper screen stays free for
 * the marquee that reports what the knob is set to.
 *
 * Rotation is driven by the angle of the finger around the knob's centre, not
 * by horizontal distance. The centre is far below the screen, so a drag near the
 * visible rim is almost purely tangential and the knob turns exactly with the
 * thumb — which is what makes it feel geared rather than mapped.
 *
 * Every stop is a detent: the knob springs onto it, and the phone ticks as it
 * passes. The setting can be changed without looking at it.
 */
export function MoodDial({ value, onChange, stops, style }: MoodDialProps) {
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();

  const last = stops.length - 1;
  const diameter = width * WIDTH_RATIO;
  const r = diameter / 2;

  /**
   * Knob rotation in degrees. 0 puts the first stop under the pointer; each
   * further stop needs another STEP of anticlockwise turn, so the working range
   * runs from 0 down to -STEP * last.
   */
  const rotation = useSharedValue(-STEP * value);

  /** Rotation when the current drag began, so deltas accumulate correctly. */
  const startRotation = useSharedValue(0);
  /** Finger angle when the current drag began. */
  const startAngle = useSharedValue(0);

  /**
   * Runs on the JS thread from the gesture. Emits only on a real detent change,
   * so turning within one stop is silent — a tick per frame would be a buzz,
   * and the tick is the whole point of a detent.
   */
  const commit = (next: number) => {
    if (next === value || next < 0 || next > last) return;
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };

  /** Finger angle around the knob's centre, in degrees. */
  const angleOf = (x: number, y: number) => {
    'worklet';
    return (Math.atan2(y - r, x - r) * 180) / Math.PI;
  };

  const pan = Gesture.Pan()
    .onBegin((event) => {
      startRotation.value = rotation.value;
      startAngle.value = angleOf(event.x, event.y);
    })
    .onUpdate((event) => {
      const delta = angleOf(event.x, event.y) - startAngle.value;
      // Clamped to the working range: a knob with a first and last setting has
      // hard stops, and letting it spin past them would report a mood that does
      // not exist.
      const next = Math.min(0, Math.max(-STEP * last, startRotation.value + delta));
      rotation.value = next;
      runOnJS(commit)(Math.round(-next / STEP));
    })
    .onEnd(() => {
      // Snap onto the nearest detent. Without this the knob rests between two
      // settings while the marquee reports one of them.
      const settled = Math.round(rotation.value / STEP) * STEP;
      rotation.value = reducedMotion ? settled : withSpring(settled, SNAP);
    });

  /**
   * Keeps the knob in step when the value is changed from somewhere other than
   * this gesture. `useAnimatedStyle` reads `value` directly rather than an
   * effect writing the shared value, because writing one from an effect puts it
   * in a dependency array — which the React Compiler's immutability rule
   * rejects, and which the tab bar and poster skeleton avoid the same way.
   */
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  /**
   * A full-size square overlay, rotated about the knob's centre, holding its
   * child at top-centre — so the child lands on the rim at exactly `deg`
   * clockwise from twelve o'clock, where the pointer is.
   *
   * Every rim element goes through this rather than doing its own trigonometry.
   * Positioning each mark individually and rotating it made every element turn
   * about the centre of its OWN box, which sits half its height away from the
   * knob's centre — so the ticks, the labels and the pointer each landed on a
   * slightly different circle and none of them lined up.
   */
  const spoke = (deg: number): ViewStyle => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: diameter,
    height: diameter,
    alignItems: 'center',
    transform: [{ rotate: `${deg}deg` }],
  });

  return (
    <View
      style={[
        { height: PEEK, width: '100%', overflow: 'hidden', alignItems: 'center' },
        style,
      ]}
    >
      {/* The fixed pointer. It never moves; the knob turns under it. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          zIndex: 10,
          alignItems: 'center',
          gap: 3,
        }}
      >
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 8,
            borderRightWidth: 8,
            borderTopWidth: 11,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: colors.paper,
          }}
        />
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View
          accessibilityRole="adjustable"
          accessibilityLabel="Mood"
          accessibilityValue={{ text: stops[value] }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => {
            const next =
              event.nativeEvent.actionName === 'increment' ? value + 1 : value - 1;
            if (next < 0 || next > last) return;
            rotation.value = -STEP * next;
            commit(next);
          }}
          style={[
            {
              position: 'absolute',
              top: 0,
              width: diameter,
              height: diameter,
              borderRadius: r,
              backgroundColor: colors.inkRaised,
              borderWidth: 3,
              borderColor: colors.noir,
            },
            knobStyle,
          ]}
        >
          {/* Knurling: a mark per stop, plus one between each pair, so the rim
              reads as graduated while it turns. */}
          {Array.from({ length: last * 2 + 1 }).map((_, index) => {
            const major = index % 2 === 0;
            return (
              <View key={index} pointerEvents="none" style={spoke((STEP / 2) * index)}>
                <View
                  style={{
                    marginTop: TICK_INSET,
                    width: 2,
                    height: major ? 16 : 9,
                    backgroundColor: major ? colors.paper : colors.paperMuted,
                  }}
                />
              </View>
            );
          })}

          {/* The stops themselves, riding on the rim. */}
          {stops.map((stop, index) => (
            <View key={stop} pointerEvents="none" style={spoke(STEP * index)}>
              <Text
                color={index === value ? colors.paper : colors.paperMuted}
                style={{
                  marginTop: LABEL_INSET,
                  fontFamily: fontFamily.displayAlt,
                  fontSize: 19,
                  letterSpacing: 0.5,
                }}
              >
                {stop}
              </Text>
            </View>
          ))}

          {/* Hub, so the knob reads as a turned part rather than a plain disc. */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: r - 46,
              top: r - 46,
              width: 92,
              height: 92,
              borderRadius: radius.pill,
              borderWidth: 2,
              borderColor: colors.noir,
              backgroundColor: colors.blood,
            }}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default MoodDial;

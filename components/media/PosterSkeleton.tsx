import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius } from '@/theme/tokens';

const PULSE_MS = 950;

export interface PosterSkeletonProps {
  width?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A poster card that has not arrived yet.
 *
 * It keeps the real card's silhouette — same paper mount, same 2:3 window, same
 * two lines of metadata beneath — so a rail does not resize when its data lands.
 * The window is filled noir rather than left blank: against the ivory mount it
 * reads as an unexposed frame, which is the one loading metaphor this app's
 * subject actually owns.
 *
 * It replaced a spinner. On a cold start every rail is pending at once, and a
 * column of eight red spinners was the first thing a new account ever saw.
 */
export function PosterSkeleton({ width = 124, style }: PosterSkeletonProps) {
  const reducedMotion = useReducedMotion();

  // `useDerivedValue`, not an effect: writing to a shared value from an effect
  // puts it in a dependency array, which the React Compiler's immutability rule
  // rejects — the same reason the tab bar drives its pill this way.
  const pulse = useDerivedValue(() =>
    reducedMotion
      ? 1
      : withRepeat(withTiming(1, { duration: PULSE_MS }), -1, true)
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.35,
  }));

  return (
    <Animated.View
      style={[{ width }, animatedStyle, style]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={{ backgroundColor: colors.paper, padding: 5, borderRadius: radius.sm }}>
        <View
          style={{
            width: '100%',
            aspectRatio: 2 / 3,
            borderRadius: 2,
            backgroundColor: colors.noir,
          }}
        />
      </View>

      <View style={{ marginTop: 7, gap: 5 }}>
        <View style={{ height: 9, width: '85%', borderRadius: 2, backgroundColor: colors.noir }} />
        <View style={{ height: 7, width: '45%', borderRadius: 2, backgroundColor: colors.noir }} />
      </View>
    </Animated.View>
  );
}

export default PosterSkeleton;

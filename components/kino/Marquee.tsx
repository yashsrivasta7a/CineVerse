import React, { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/Text';
import type { TypeVariant } from '@/theme/typography';

export interface MarqueeProps {
  text: string;
  variant?: TypeVariant;
  color?: string;
  /** Pixels per second. */
  speed?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Endlessly scrolling headline — the repeated wordmark band from the mockups.
 *
 * The string is measured once, then rendered twice side by side and translated
 * by exactly one copy's width, so the loop point is seamless.
 */
export function Marquee({
  text,
  variant = 'display',
  color,
  speed = 42,
  gap = 28,
  style,
}: MarqueeProps) {
  const [width, setWidth] = useState(0);
  const offset = useSharedValue(0);

  useEffect(() => {
    if (width <= 0) return;

    const distance = width + gap;
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(-distance, {
        duration: (distance / speed) * 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => cancelAnimation(offset);
  }, [width, gap, speed, offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View style={[{ overflow: 'hidden' }, style]} pointerEvents="none">
      <Animated.View style={[{ flexDirection: 'row', gap }, animatedStyle]}>
        <Text
          variant={variant}
          color={color}
          numberOfLines={1}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        >
          {text}
        </Text>
        <Text variant={variant} color={color} numberOfLines={1}>
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

export default Marquee;

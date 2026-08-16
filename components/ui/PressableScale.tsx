import React from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  /** Optional: a bare pressable surface — a pull handle, a swatch — has none. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale at full press. */
  scaleTo?: number;
  disabled?: boolean;
}

const SPRING = { damping: 17, stiffness: 340, mass: 0.5 };

/**
 * Pressable with a spring scale response.
 *
 * The animation runs entirely on the UI thread via Reanimated, so it stays
 * smooth even while the JS thread is busy fetching or filtering — which is
 * exactly when a list like this gets tapped.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.94,
  disabled,
  ...rest
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value === 1 ? scaleTo : 1, SPRING) }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export default PressableScale;

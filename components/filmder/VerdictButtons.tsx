import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { colors } from '@/theme/tokens';

export interface VerdictButtonsProps {
  onDown?: () => void;
  onUp?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Thumbs-down / thumbs-up pair.
 *
 * These are the accessible path for the Filmder deck — a swipe gesture on its
 * own is unusable with a screen reader, so the buttons must drive exactly the
 * same verdict code path the gesture does, not a parallel one.
 *
 * Built on `PressableScale`, NOT on a bare `Pressable` with a
 * `style={({ pressed }) => …}` callback. NativeWind wraps `Pressable` through
 * its `cssInterop` layer, and that wrapper does not reliably invoke a function
 * style — the returned object is dropped, taking `backgroundColor` with it. The
 * symptom is precise and misleading: sizing and layout survive (they come from
 * the flattened array), the fills do not, so the pair renders as two bare icons
 * floating on the page with no key behind them.
 */
/**
 * Proportions, all as a fraction of the button's side so the pair scales as one
 * object. Measured off the reference rather than picked: the corner is a
 * squircle at just over a quarter of the side, and the glyph fills half of it.
 */
const CORNER = 0.34;
const GLYPH = 0.5;
const GAP = 0.1;

export function VerdictButtons({
  onDown,
  onUp,
  size = 76,
  style,
}: VerdictButtonsProps) {
  const press = (handler?: () => void, heavy = false) => () => {
    Haptics.impactAsync(
      heavy ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    handler?.();
  };

  // Square, with a generous corner — the pair reads as two stamped keys, not as
  // the circular buttons every other swipe app uses.
  const base = {
    width: size,
    height: size,
    borderRadius: size * CORNER,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  return (
    <View
      style={[
        { flexDirection: 'row', gap: size * GAP, justifyContent: 'center' },
        style,
      ]}
    >
      <PressableScale
        onPress={press(onDown)}
        scaleTo={0.93}
        accessibilityRole="button"
        accessibilityLabel="Not for me"
        style={{
          ...base,
          backgroundColor: colors.blood,
          borderWidth: 3,
          borderColor: colors.inkDeep,
        }}
      >
        {/* Cream on red, mirroring the red-on-cream of its partner — the two
            keys are the same key inverted, which is what makes them a pair. */}
        <Ionicons name="thumbs-down" size={size * GLYPH} color={colors.inkDeep} />
      </PressableScale>

      <PressableScale
        onPress={press(onUp, true)}
        scaleTo={0.93}
        accessibilityRole="button"
        accessibilityLabel="Interested"
        style={{ ...base, backgroundColor: colors.paper }}
      >
        <Ionicons name="thumbs-up" size={size * GLYPH} color={colors.blood} />
      </PressableScale>
    </View>
  );
}

export default VerdictButtons;

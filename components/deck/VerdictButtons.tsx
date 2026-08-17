import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { colors } from '@/theme/tokens';

/**
 * Which question the keys are asking about the card in front of the user.
 *
 * `intent` is the default and covers the overwhelming majority of cards — a
 * discovery deck is mostly films the user has not seen, so the big keys mirror
 * the swipe: pass it, or file it in the vault. `taste` is what the "Seen it
 * already?" pill switches to, for one card at a time: now a thumb is honest,
 * because you can only rate a film you have watched.
 */
export type VerdictMode = 'intent' | 'taste';

export interface VerdictButtonsProps {
  onDown?: () => void;
  onUp?: () => void;
  mode?: VerdictMode;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Glyph and label per mode. The intent icons are deliberately NOT thumbs — a
 * thumb is a rating, and the user has not seen the film yet; the honest verbs
 * are "skip it" and "save it". The thumbs live behind the seen pill.
 */
const FACES: Record<
  VerdictMode,
  {
    down: { icon: keyof typeof Ionicons.glyphMap; label: string };
    up: { icon: keyof typeof Ionicons.glyphMap; label: string };
  }
> = {
  intent: {
    down: { icon: 'close', label: 'Pass' },
    up: { icon: 'bookmark', label: 'Add to my vault' },
  },
  taste: {
    down: { icon: 'thumbs-down', label: 'Watched it, did not like it' },
    up: { icon: 'thumbs-up', label: 'Watched it, liked it' },
  },
};

/**
 * Proportions, all as a fraction of the button's side so the pair scales as one
 * object: squircle corner at just over a quarter of the side, glyph at half.
 *
 * Built on `PressableScale`, NOT a bare `Pressable` with a function style —
 * NativeWind's cssInterop wrapper drops function-style results, which renders
 * the pair as two bare icons with no key behind them.
 */
const CORNER = 0.34;
const GLYPH = 0.5;
const GAP = 0.1;

export function VerdictButtons({
  onDown,
  onUp,
  mode = 'intent',
  size = 76,
  style,
}: VerdictButtonsProps) {
  const face = FACES[mode];

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
        accessibilityLabel={face.down.label}
        style={{
          ...base,
          backgroundColor: colors.blood,
          borderWidth: 3,
          borderColor: colors.inkDeep,
        }}
      >
        {/* Cream on red, mirroring the red-on-cream of its partner — the two
            keys are the same key inverted, which is what makes them a pair. */}
        <Ionicons name={face.down.icon} size={size * GLYPH} color={colors.inkDeep} />
      </PressableScale>

      <PressableScale
        onPress={press(onUp, true)}
        scaleTo={0.93}
        accessibilityRole="button"
        accessibilityLabel={face.up.label}
        style={{ ...base, backgroundColor: colors.paper }}
      >
        <Ionicons name={face.up.icon} size={size * GLYPH} color={colors.blood} />
      </PressableScale>
    </View>
  );
}

export default VerdictButtons;

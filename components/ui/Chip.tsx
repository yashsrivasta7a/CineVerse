import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from './Text';
import { colors, radius, withAlpha } from '@/theme/tokens';

export type ChipTone = 'noir' | 'paper' | 'blood' | 'outline' | 'ink';

export interface ChipProps {
  label: string;
  tone?: ChipTone;
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<ChipTone, { background: string; text: string; border: string }> = {
  noir: {
    background: colors.noir,
    text: colors.paper,
    border: 'transparent',
  },
  ink: {
    background: colors.inkDeep,
    text: colors.paper,
    border: 'transparent',
  },
  paper: {
    background: colors.paper,
    text: colors.ink,
    border: 'transparent',
  },
  blood: {
    background: colors.blood,
    text: colors.paper,
    border: 'transparent',
  },
  outline: {
    background: 'transparent',
    text: colors.paper,
    border: withAlpha(colors.paper, 0.4),
  },
};

/** The rounded metadata pills — USA · Fantasy · 1h 15min. */
export function Chip({ label, tone = 'noir', style }: ChipProps) {
  const palette = TONES[tone];

  return (
    <View
      style={[
        {
          backgroundColor: palette.background,
          borderRadius: radius.pill,
          // A transparent 1dp border is not free: it adds 2dp to every pill,
          // and on Android a transparent edge over photography can flash a
          // hairline. Only the `outline` tone actually draws one.
          borderWidth: palette.border === 'transparent' ? 0 : 1,
          borderColor: palette.border,
          paddingHorizontal: 11,
          paddingVertical: 5,
        },
        style,
      ]}
    >
      <Text variant="chip" color={palette.text}>
        {label}
      </Text>
    </View>
  );
}

export default Chip;

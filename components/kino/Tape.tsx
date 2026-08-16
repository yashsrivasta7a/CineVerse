import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, withAlpha } from '@/theme/tokens';

export interface TapeProps {
  width?: number;
  height?: number;
  rotate?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** A strip of masking tape — used to pin polaroids and cards to the page. */
export function Tape({
  width = 62,
  height = 22,
  rotate = -8,
  color = colors.paperDim,
  style,
}: TapeProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          width,
          height,
          backgroundColor: withAlpha(color, 0.82),
          transform: [{ rotate: `${rotate}deg` }],
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: withAlpha(colors.noir, 0.12),
        },
        style,
      ]}
    />
  );
}

export default Tape;

import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, withAlpha } from '@/theme/tokens';

export interface PushPinProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** The pin holding a card to the board. */
export function PushPin({
  size = 14,
  color = colors.blood,
  style,
}: PushPinProps) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: withAlpha(colors.noir, 0.35),
        },
        style,
      ]}
    >
      <View
        style={{
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          backgroundColor: withAlpha(colors.white, 0.55),
          marginTop: -size * 0.12,
          marginLeft: -size * 0.12,
        }}
      />
    </View>
  );
}

export default PushPin;

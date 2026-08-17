import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, withAlpha } from '@/theme/tokens';

export interface RatingStarsProps {
  /** 0-10, as TMDB reports it. */
  value: number;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Five stars over a 0-10 scale, half-steps included. */
export function RatingStars({
  value,
  size = 12,
  color = colors.blood,
  style,
}: RatingStarsProps) {
  const outOfFive = Math.max(0, Math.min(5, value / 2));

  return (
    <View
      style={[{ flexDirection: 'row', gap: 1 }, style]}
      accessibilityRole="image"
      accessibilityLabel={`Rated ${value.toFixed(1)} out of 10`}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const filled = outOfFive - index;
        const name =
          filled >= 0.75 ? 'star' : filled >= 0.25 ? 'star-half' : 'star-outline';

        return (
          <Ionicons
            key={index}
            name={name}
            size={size}
            color={filled >= 0.25 ? color : withAlpha(color, 0.35)}
          />
        );
      })}
    </View>
  );
}

export default RatingStars;

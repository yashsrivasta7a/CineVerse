import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius } from '@/theme/tokens';

export interface ReactionTagProps {
  label: string;
  tone?: 'blood' | 'paper';
  style?: StyleProp<ViewStyle>;
}

/**
 * The small outlined pill that sits over a poster carrying someone's verdict —
 * "The movie is shit", "The film is ok".
 */
export function ReactionTag({ label, tone = 'blood', style }: ReactionTagProps) {
  const isBlood = tone === 'blood';

  return (
    <View
      style={[
        {
          alignSelf: 'flex-start',
          backgroundColor: isBlood ? colors.blood : colors.paper,
          borderColor: isBlood ? colors.paper : colors.ink,
          borderWidth: 1,
          borderRadius: radius.sm,
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
        style,
      ]}
    >
      <Text variant="chip" color={isBlood ? colors.paper : colors.ink} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default ReactionTag;

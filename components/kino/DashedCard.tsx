import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/tokens';

export interface DashedCardProps {
  children: React.ReactNode;
  background?: string;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Red panel with a dashed ivory rule inset from the edge — the frame around
 * the film title block in the masterplan.
 *
 * The dash is a separate inset View rather than a border on the card itself:
 * React Native drops the dash pattern whenever `borderRadius` is non-zero, so
 * the rounded card and the dashed rule have to be two elements.
 */
export function DashedCard({
  children,
  background = colors.blood,
  borderColor = colors.paper,
  style,
  contentStyle,
}: DashedCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: background,
          borderRadius: radius.lg,
          padding: 7,
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 7,
          left: 7,
          right: 7,
          bottom: 7,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderRadius: 0,
          borderColor,
          opacity: 0.75,
        }}
      />
      <View style={[{ padding: 8 }, contentStyle]}>{children}</View>
    </View>
  );
}

export default DashedCard;

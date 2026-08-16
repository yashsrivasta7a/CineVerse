import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { Text } from './Text';
import { c, colors, displayShadowOffset } from '@/theme/tokens';
import type { TypeVariant } from '@/theme/typography';

export interface DisplayProps {
  children: string;
  variant?: Extract<TypeVariant, 'displayXl' | 'display' | 'displaySm' | 'displayXs'>;
  color?: string;
  shadowColor?: string;
  offset?: { x: number; y: number };
  numberOfLines?: number;
  /** Horizontal alignment of the type inside its box. */
  align?: TextStyle['textAlign'];
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Heavy display type with a hard offset shadow.
 *
 * The shadow is a second copy of the string rendered behind the first, NOT
 * `textShadow*`: React Native has no shadow spread, and Android renders
 * `textShadowRadius` blurred and clipped at the text bounds — neither gives the
 * flat poster offset the design is built on.
 *
 * The back copy uses `absoluteFill` + a transform rather than `left`/`right`
 * offsets. That matters: `absoluteFill` inherits the exact box the front copy
 * established, so both copies wrap at identical points. Offsetting via
 * `left`/`right` instead made the shadow box a different width from the front
 * one, which desynchronised the line breaks and read as overlapping text —
 * worst inside a shrink-to-fit parent, where the box has no intrinsic width.
 */
export function Display({
  children,
  variant = 'display',
  color = c.text,
  shadowColor = colors.noir,
  offset = displayShadowOffset,
  numberOfLines,
  align,
  style,
  textStyle,
}: DisplayProps) {
  const shared: StyleProp<TextStyle> = [align ? { textAlign: align } : null, textStyle];

  return (
    <View style={style}>
      <Text
        variant={variant}
        color={shadowColor}
        numberOfLines={numberOfLines}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX: offset.x }, { translateY: offset.y }] },
          shared,
        ]}
      >
        {children}
      </Text>

      <Text variant={variant} color={color} numberOfLines={numberOfLines} style={shared}>
        {children}
      </Text>
    </View>
  );
}

export default Display;

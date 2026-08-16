import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

export interface OsdCornerProps {
  left?: string;
  right?: string;
  color?: string;
  /** Renders the blinking-style ●REC dot beside the right-hand label. */
  rec?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The VCR on-screen-display chrome that runs along the top of the masterplan's
 * pages — [KINOROY] on the left, [SCROLL&TARGET] or a timecode on the right.
 * Pure decoration, so it is hidden from screen readers.
 */
export function OsdCorner({
  left,
  right,
  color = colors.paperDeep,
  rec = false,
  style,
}: OsdCornerProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        },
        style,
      ]}
    >
      <Text variant="osd" color={color}>
        {left ? `[${left}]` : ''}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {rec ? (
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.blood,
            }}
          />
        ) : null}
        <Text variant="osd" color={color}>
          {right ? `[${right}]` : ''}
        </Text>
      </View>
    </View>
  );
}

export default OsdCorner;

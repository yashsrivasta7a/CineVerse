import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, withAlpha } from '@/theme/tokens';

export interface PolaroidFrameProps {
  children: React.ReactNode;
  caption?: string;
  date?: string;
  /** Degrees. Derive from a stable id so it doesn't jitter on re-render. */
  tilt?: number;
  background?: string;
  style?: StyleProp<ViewStyle>;
}

/** Deterministic tilt from any id — same card, same angle, every render. */
export const tiltFromId = (id: number | string): number => {
  const n = typeof id === 'number' ? id : String(id).length + String(id).charCodeAt(0);
  return ((n % 5) - 2) * 1.2;
};

/** A photo print: paper border, deep bottom margin, handwritten caption. */
export function PolaroidFrame({
  children,
  caption,
  date,
  tilt = 0,
  background = colors.paper,
  style,
}: PolaroidFrameProps) {
  return (
    <View
      style={[
        {
          backgroundColor: background,
          padding: 7,
          paddingBottom: caption || date ? 10 : 7,
          borderRadius: radius.sm,
          transform: [{ rotate: `${tilt}deg` }],
          shadowColor: colors.noir,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
          elevation: 5,
        },
        style,
      ]}
    >
      {children}

      {caption || date ? (
        <View style={{ marginTop: 8, gap: 1 }}>
          {caption ? (
            <Text variant="script" color={colors.ink} numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
          {date ? (
            <Text variant="osd" color={withAlpha(colors.ink, 0.55)}>
              {date}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default PolaroidFrame;

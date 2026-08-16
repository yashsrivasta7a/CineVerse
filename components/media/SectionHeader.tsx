import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Display } from '@/components/ui/Display';
import { Text } from '@/components/ui/Text';
import { FilmStrip } from '@/components/kino/FilmStrip';
import { colors, withAlpha } from '@/theme/tokens';

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  /** Handwritten word slashed across the heading, as in the mockups. */
  script?: string;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
  title,
  subtitle,
  script,
  style,
}: SectionHeaderProps) {
  return (
    <View style={[{ gap: 8 }, style]}>
      <View>
        <Display variant="displaySm">{title}</Display>
        {script ? (
          <Text
            variant="script"
            color={colors.blood}
            style={{
              position: 'absolute',
              right: 4,
              top: -6,
              transform: [{ rotate: '-6deg' }],
            }}
          >
            {script}
          </Text>
        ) : null}
      </View>

      {subtitle ? (
        <Text variant="bodySm" color={withAlpha(colors.paper, 0.55)}>
          {subtitle}
        </Text>
      ) : null}

      <FilmStrip height={10} pitch={16} />
    </View>
  );
}

export default SectionHeader;

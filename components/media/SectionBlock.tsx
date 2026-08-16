import { View, type StyleProp, type ViewStyle, type TextStyle } from 'react-native';

import { Display } from '@/components/ui/Display';
import { Text } from '@/components/ui/Text';
import { colors, grid, withAlpha } from '@/theme/tokens';

export interface SectionBlockProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Children handle their own horizontal padding (rails, carousels). */
  bleed?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}

/** Heading + body, with the one spacing rhythm every detail section uses. */
export function SectionBlock({
  title,
  subtitle,
  children,
  bleed = false,
  style,
  titleStyle,
}: SectionBlockProps) {
  return (
    <View style={[{ gap: 12 }, style]}>
      <View style={{ paddingHorizontal: grid.screenPadding }}>
        <Display variant="displaySm" textStyle={titleStyle}>{title}</Display>
        {subtitle ? (
          <Text variant="osd" color={withAlpha(colors.paper, 0.5)} style={{ marginTop: 4 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={bleed ? undefined : { paddingHorizontal: grid.screenPadding }}>
        {children}
      </View>
    </View>
  );
}

export default SectionBlock;

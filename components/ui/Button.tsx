import React from 'react';
import {
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from './Text';
import { colors, radius, withAlpha } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'paper' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: React.ReactNode;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
}

const VARIANTS: Record<ButtonVariant, { background: string; text: string; border: string }> = {
  primary: { background: colors.blood, text: colors.paper, border: colors.noir },
  paper: { background: colors.paper, text: colors.ink, border: colors.noir },
  ghost: {
    background: 'transparent',
    text: colors.paper,
    border: withAlpha(colors.paper, 0.4),
  },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
  full = true,
  style,
}: ButtonProps) {
  const palette = VARIANTS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          backgroundColor: palette.background,
          borderRadius: radius.md,
          borderWidth: 2,
          borderColor: palette.border,
          paddingVertical: 13,
          paddingHorizontal: 20,
          alignSelf: full ? 'stretch' : 'flex-start',
          opacity: disabled ? 0.45 : 1,
          // Pressed state shifts the button onto its own drop shadow.
          transform: [{ translateY: pressed && !disabled ? 2 : 0 }],
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {icon}
        <Text variant="label" color={palette.text}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default Button;

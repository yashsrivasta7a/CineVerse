import React from 'react';
import {
  Text as RNText,
  type TextProps as RNTextProps,
} from 'react-native';

import { c } from '@/theme/tokens';
import { typography, type TypeVariant } from '@/theme/typography';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  color?: string;
}

/**
 * The app's only text primitive.
 *
 * Every string goes through here so that font family and weight are always
 * chosen together from `theme/typography`. Importing `Text` straight from
 * react-native re-opens the Android bug where `fontWeight` is silently dropped
 * on a custom `fontFamily`.
 */
export function Text({ variant = 'body', color, style, ...rest }: TextProps) {
  return (
    <RNText
      {...rest}
      style={[typography[variant], { color: color ?? c.text }, style]}
    />
  );
}

export default Text;

import React, { forwardRef } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, withAlpha } from '@/theme/tokens';
import { typography } from '@/theme/typography';

export interface SearchFieldProps {
  placeholder: string;
  /** Read-only mode: the whole field acts as a button to the search screen. */
  onPress?: () => void;
  value?: string;
  onChangeText?: (text: string) => void;
  autoFocus?: boolean;
  /** `pill` is the soft onboarding treatment; `boxed` is the hard-edged one. */
  variant?: 'pill' | 'boxed';
  style?: StyleProp<ViewStyle>;
}

export const SearchField = forwardRef<TextInput, SearchFieldProps>(
  (
    { placeholder, onPress, value, onChangeText, autoFocus = false, variant = 'boxed', style },
    ref
  ) => {
    const pill = variant === 'pill';

    const input = (
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={withAlpha(colors.ink, 0.45)}
        autoFocus={autoFocus}
        editable={!onPress}
        pointerEvents={onPress ? 'none' : 'auto'}
        style={[typography.body, { flex: 1, color: colors.ink, padding: 0 }]}
      />
    );

    return (
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.paper,
            borderRadius: pill ? radius.pill : radius.sm,
            borderWidth: pill ? 0 : 2,
            borderColor: colors.noir,
            paddingHorizontal: pill ? 16 : 12,
            paddingVertical: pill ? 13 : 11,
          },
          style,
        ]}
      >
        <Ionicons
          name="search"
          size={17}
          color={pill ? withAlpha(colors.ink, 0.5) : colors.blood}
        />
        {onPress ? (
          <Pressable
            onPress={onPress}
            style={{ flex: 1 }}
            accessibilityRole="search"
            accessibilityLabel={placeholder}
          >
            {input}
          </Pressable>
        ) : (
          input
        )}
      </View>
    );
  }
);

SearchField.displayName = 'SearchField';

export default SearchField;

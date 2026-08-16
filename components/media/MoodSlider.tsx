import React from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/Text';
import { Display } from '@/components/ui/Display';
import { colors, withAlpha } from '@/theme/tokens';

export const MOOD_STOPS = ['BAD', 'MEH', 'NORMAL', 'GOOD', 'GREAT'] as const;
export type MoodStop = (typeof MOOD_STOPS)[number];

export interface MoodSliderProps {
  /** Index into MOOD_STOPS. */
  value: number;
  onChange: (index: number) => void;
  showLabel?: boolean;
  caption?: string;
  trackColor?: string;
  labelColor?: string;
  style?: StyleProp<ViewStyle>;
}

import { Path } from 'react-native-svg';

/** The ticket-notch thumb from the new mockup's slider. */
const Thumb = ({ color }: { color: string }) => (
  <Svg width={28} height={20} viewBox="0 0 24 18">
    <Path d="M 0 0 H 24 V 5 A 4 4 0 0 0 24 13 V 18 H 0 V 13 A 4 4 0 0 0 0 5 Z" fill={color} />
  </Svg>
);

/**
 * Five-stop mood control.
 *
 * Stops are individually pressable rather than pan-driven: it is the accessible
 * path (a pan gesture alone is unusable with a screen reader), each stop is a
 * real target, and the discrete steps are what the design actually calls for.
 * Phase 6 layers a pan gesture on top of the same value model.
 */
export function MoodSlider({
  value,
  onChange,
  showLabel = true,
  caption,
  trackColor = colors.blood,
  labelColor = colors.blood,
  style,
}: MoodSliderProps) {
  const select = (index: number) => {
    if (index !== value) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(index);
  };

  return (
    <View style={[{ gap: 10 }, style]}>
      {showLabel ? (
        <Display variant="display" color={labelColor} style={{ alignSelf: 'center' }}>
          {MOOD_STOPS[value]}
        </Display>
      ) : null}

      <View style={{ height: 26, justifyContent: 'center' }}>
        {/* Track */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 6,
            right: 6,
            height: 2,
            backgroundColor: trackColor,
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
          accessibilityRole="adjustable"
          accessibilityLabel="Mood"
          accessibilityValue={{ text: MOOD_STOPS[value] }}
        >
          {MOOD_STOPS.map((stop, index) => (
            <Pressable
              key={stop}
              onPress={() => select(index)}
              accessibilityRole="button"
              accessibilityLabel={stop.toLowerCase()}
              accessibilityState={{ selected: index === value }}
              hitSlop={12}
              style={{ width: 28, height: 26, alignItems: 'center', justifyContent: 'center' }}
            >
              {index === value ? (
                <Thumb color={colors.paper} />
              ) : (
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: colors.ink,
                    borderWidth: 3,
                    borderColor: trackColor,
                  }}
                />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {caption ? (
        <Text
          variant="bodySm"
          color={withAlpha(colors.paper, 0.75)}
          style={{ textAlign: 'center' }}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export default MoodSlider;

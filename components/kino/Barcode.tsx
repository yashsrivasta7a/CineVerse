import React, { useMemo } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';

export interface BarcodeProps {
  /** Any stable identifier — a TMDB id gives each film its own constant code. */
  value: number | string;
  height?: number;
  bars?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Decorative barcode for ticket stubs.
 *
 * Widths are derived from `value`, so a given film's barcode is identical every
 * time it renders instead of shuffling on each mount.
 */
export function Barcode({
  value,
  height = 26,
  bars = 30,
  color = colors.ink,
  style,
}: BarcodeProps) {
  const widths = useMemo(() => {
    const text = String(value);
    let seed = 7;
    for (let i = 0; i < text.length; i += 1) {
      seed = (seed * 31 + text.charCodeAt(i)) % 233280;
    }

    // A plain loop, not Array.from(cb): the React Compiler cannot prove a
    // captured variable mutated inside a callback stays local to this memo.
    const result: number[] = [];
    for (let i = 0; i < bars; i += 1) {
      seed = (seed * 9301 + 49297) % 233280;
      const r = seed / 233280;
      result.push(r < 0.35 ? 1 : r < 0.72 ? 2 : 4);
    }
    return result;
  }, [value, bars]);

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }, style]}>
      {widths.map((width, index) => (
        <View
          key={index}
          style={{
            width,
            height,
            backgroundColor: color,
            opacity: width === 1 ? 0.75 : 1,
          }}
        />
      ))}
    </View>
  );
}

export default Barcode;

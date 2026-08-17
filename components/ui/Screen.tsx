import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { HalftoneOverlay } from '@/components/decor/HalftoneOverlay';
import { c, grid } from '@/theme/tokens';

export interface ScreenProps {
  children: React.ReactNode;
  background?: string;
  edges?: readonly Edge[];
  /**
   * Print texture. Off by default — at screen scale the dot pattern reads as
   * noise over photography and muddies the flat colour blocks the design is
   * built on. Opt in per surface if a paper texture is actually wanted.
   */
  texture?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen chrome: ground colour and safe areas.
 *
 * The VCR-style OSD strip that used to run across the top of thirteen screens
 * is gone. It printed things like "THE VAULT / SAVED&KEPT" above the actual
 * heading, which said the same thing twice in a smaller, dimmer face — costume
 * sitting in the one place a screen most needs to be legible.
 */
export function Screen({
  children,
  background = c.bg,
  edges = ['top'],
  texture = false,
  padded = false,
  style,
}: ScreenProps) {
  return (
    <View style={[{ flex: 1, backgroundColor: background }, style]}>
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: padded ? grid.screenPadding : 0,
          }}
        >
          {children}
        </View>
      </SafeAreaView>

      {texture ? <HalftoneOverlay /> : null}
    </View>
  );
}

export default Screen;

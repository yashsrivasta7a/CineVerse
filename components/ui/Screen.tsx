import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { HalftoneOverlay } from '@/components/kino/HalftoneOverlay';
import { OsdCorner } from '@/components/kino/OsdCorner';
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
  /** VCR chrome across the top. */
  osd?: { left?: string; right?: string; rec?: boolean };
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Screen chrome: ground colour, safe areas, and the optional OSD strip.
 * Replaces the per-screen AuroraBackground, which ran a WebGL render loop on
 * five screens and never paused when they lost focus.
 */
export function Screen({
  children,
  background = c.bg,
  edges = ['top'],
  texture = false,
  osd,
  padded = false,
  style,
}: ScreenProps) {
  return (
    <View style={[{ flex: 1, backgroundColor: background }, style]}>
      <SafeAreaView style={{ flex: 1 }} edges={edges}>
        {osd ? (
          <OsdCorner
            left={osd.left}
            right={osd.right}
            rec={osd.rec}
            style={{ paddingHorizontal: grid.screenPadding, paddingTop: 10 }}
          />
        ) : null}

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

import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Pattern, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export interface HalftoneOverlayProps {
  color?: string;
  opacity?: number;
  /** Pattern cell size in px — smaller reads as grain, larger as halftone. */
  cell?: number;
  dotRadius?: number;
}

/**
 * The print-texture layer.
 *
 * A single tiled SVG pattern, not thousands of circle nodes and not a WebGL
 * shader — the previous aurora background ran a per-frame GL loop on five
 * screens and never paused on blur. This draws once and costs nothing after.
 *
 * Mount it ONCE, near the root of a screen, above content and below nothing.
 */
export function HalftoneOverlay({
  color = colors.noir,
  opacity = 0.07,
  cell = 5,
  dotRadius = 1,
}: HalftoneOverlayProps) {
  const patternId = `halftone-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            x="0"
            y="0"
            width={cell}
            height={cell}
          >
            <Circle cx={cell / 2} cy={cell / 2} r={dotRadius} fill={color} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${patternId})`} />
      </Svg>
    </View>
  );
}

export default HalftoneOverlay;

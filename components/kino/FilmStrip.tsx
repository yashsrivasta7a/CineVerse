import React, { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export interface FilmStripProps {
  height?: number;
  stripColor?: string;
  holeColor?: string;
  /** Distance between sprocket holes. */
  pitch?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A strip of film with sprocket holes, drawn as a single tiled SVG pattern —
 * one node regardless of how wide the strip is, rather than N hole elements.
 */
export function FilmStrip({
  height = 18,
  stripColor = colors.noir,
  holeColor = colors.paper,
  pitch = 22,
  style,
}: FilmStripProps) {
  // useId can contain characters that are invalid inside an SVG url(#...) ref.
  const patternId = `sprockets-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const holeWidth = Math.min(12, pitch * 0.55);
  const holeHeight = Math.max(4, height * 0.42);

  return (
    <Svg width="100%" height={height} style={style} pointerEvents="none">
      <Defs>
        <Pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={pitch}
          height={height}
        >
          <Rect
            x={(pitch - holeWidth) / 2}
            y={(height - holeHeight) / 2}
            width={holeWidth}
            height={holeHeight}
            rx={1.5}
            fill={holeColor}
          />
        </Pattern>
      </Defs>

      <Rect x="0" y="0" width="100%" height={height} fill={stripColor} />
      <Rect x="0" y="0" width="100%" height={height} fill={`url(#${patternId})`} />
    </Svg>
  );
}

export default FilmStrip;

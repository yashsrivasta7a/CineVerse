import React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';

export interface DashedRuleProps {
  color: string;
  thickness?: number;
  dash?: number;
  gap?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * A perforation line, drawn in SVG rather than with a dashed border.
 *
 * React Native's `borderStyle: 'dashed'` is only well defined when all four
 * border widths are set. With a single edge — which is what a rule is — iOS
 * routinely falls back to solid, and Android derives the dash length from the
 * border width, so a thin rule comes out as a near-solid hairline. Neither
 * renders the tear-off perforation the design asks for.
 *
 * `strokeDasharray` is deterministic on both platforms.
 */
export function DashedRule({
  color,
  thickness = 3,
  dash = 9,
  gap = 7,
  style,
}: DashedRuleProps) {
  return (
    <Svg width="100%" height={thickness} style={style} pointerEvents="none">
      <Line
        x1="0"
        y1={thickness / 2}
        x2="100%"
        y2={thickness / 2}
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={`${dash},${gap}`}
        strokeLinecap="butt"
      />
    </Svg>
  );
}

export default DashedRule;

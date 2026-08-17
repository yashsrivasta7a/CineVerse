import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { TornEdge, type TornVariant } from './TornEdge';

export interface TornSectionProps {
  children: React.ReactNode;
  /** Block colour. The torn edges are cut from this same colour. */
  background: string;
  top?: boolean;
  bottom?: boolean;
  edgeHeight?: number;
  variant?: TornVariant;
  seed?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * A colour block whose edges are torn rather than ruled — the masterplan's
 * primary way of separating a red feature band from the brown ground.
 */
export function TornSection({
  children,
  background,
  top = true,
  bottom = true,
  edgeHeight,
  variant = 'ripped',
  seed = 7,
  style,
  contentStyle,
}: TornSectionProps) {
  return (
    <View style={style}>
      {top ? (
        <TornEdge
          fill={background}
          height={edgeHeight}
          seed={seed}
          variant={variant}
        />
      ) : null}

      <View style={[{ backgroundColor: background }, contentStyle]}>{children}</View>

      {bottom ? (
        <TornEdge
          fill={background}
          height={edgeHeight}
          seed={seed + 13}
          variant={variant}
          flip
        />
      ) : null}
    </View>
  );
}

export default TornSection;

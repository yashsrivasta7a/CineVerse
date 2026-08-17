import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/theme/tokens';

export interface TicketCardProps {
  children: React.ReactNode;
  background?: string;
  /**
   * Colour of whatever sits behind the card. The notches are punched by
   * drawing circles in this colour over the card's edges, so it has to match
   * the surface underneath or the cut-outs read as dots.
   */
  pageBackground?: string;
  notchSize?: number;
  /** Distance from the top of the card to the notch centreline. */
  notchOffset?: number;
  showTearLine?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * A ticket stub: rounded body, two punched notches, and a dashed tear line.
 *
 * Concave cut-outs aren't expressible in React Native's box model, so the
 * notches are overlaid circles filled with the page colour — the one technique
 * that behaves identically on both platforms.
 */
export function TicketCard({
  children,
  background = colors.paper,
  pageBackground = colors.ink,
  notchSize = 20,
  notchOffset,
  showTearLine = true,
  style,
}: TicketCardProps) {
  const [height, setHeight] = React.useState(0);
  const y = notchOffset ?? (height ? height * 0.66 : 0);

  return (
    <View
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={[
        {
          backgroundColor: background,
          borderRadius: radius.md,
          overflow: 'visible',
        },
        style,
      ]}
    >
      {children}

      {height > 0 ? (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -notchSize / 2,
              top: y - notchSize / 2,
              width: notchSize,
              height: notchSize,
              borderRadius: notchSize / 2,
              backgroundColor: pageBackground,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -notchSize / 2,
              top: y - notchSize / 2,
              width: notchSize,
              height: notchSize,
              borderRadius: notchSize / 2,
              backgroundColor: pageBackground,
            }}
          />
          {showTearLine ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: notchSize / 2 + 2,
                right: notchSize / 2 + 2,
                top: y,
                borderTopWidth: 1,
                borderStyle: 'dashed',
                // borderRadius must stay 0 or Android drops the dash pattern.
                borderRadius: 0,
                borderColor: 'rgba(37, 23, 17, 0.35)',
              }}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}

export default TicketCard;

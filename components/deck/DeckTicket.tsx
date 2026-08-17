import React from 'react';
import { useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';

import { TitleBanner } from '@/components/deck/TitleBanner';
import { DashedRule } from '@/components/decor/DashedRule';
import { colors } from '@/theme/tokens';

export interface DeckTicketProps {
  title: string;
  /** The window contents — the deck. */
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Gap between the ticket and the screen edge.
 *
 * Exported because the screen applies it and the ticket has to know it: the
 * title is sized from measured font metrics in one pass, so the component needs
 * the exact content width, and it cannot get that from a layout callback
 * without rendering the wrong size for a frame first.
 */
export const TICKET_MARGIN = 10;

const BORDER = 6;
const OUTER_RADIUS = 20;
/** Red showing between the frame and everything inside it. */
const PAD = 7;

/**
 * Corner of the picture window.
 *
 * Exported because `DeckCard` has to round its still to the SAME value: the
 * card fills the window exactly, so any difference between the two leaves a red
 * arc showing at each corner.
 */
export const WINDOW_RADIUS = OUTER_RADIUS - PAD;

/**
 * The Filmder ticket: title stub and picture window as ONE torn-off ticket
 * rather than two stacked cards.
 *
 * The red is a single continuous body. That is the whole point of the shape —
 * the stub and the window are the same piece of card, joined across a
 * perforation, so neither may carry a panel, border or radius of its own. An
 * earlier version drew the title on its own rounded red board above a separately
 * framed card, which reads as two components that happen to share a colour.
 *
 * This is fixed chrome. The cards move *inside* the window; the ticket does not
 * travel with the gesture, and nothing here clips — a swiped card has to be able
 * to leave the frame entirely.
 */
export function DeckTicket({ title, children, style }: DeckTicketProps) {
  const { width } = useWindowDimensions();

  // What the stub actually has to draw into, counted out from the screen.
  const contentWidth = width - TICKET_MARGIN * 2 - BORDER * 2 - PAD * 2;

  return (
    <View style={[{ flex: 1 }, style]}>
      {/* Upper stub */}
      <View
        style={{
          backgroundColor: colors.blood,
          borderRadius: OUTER_RADIUS,
          borderWidth: BORDER,
          borderColor: colors.blood,
          padding: PAD,
          zIndex: 2,
        }}
      >
        <TitleBanner title={title} availableWidth={contentWidth} />
      </View>

      {/* The perforated joint, drawn over the seam */}
      <View style={{ height: 0, justifyContent: 'center', zIndex: 10 }}>
        <DashedRule color={colors.inkDeep} thickness={3} />
      </View>

      {/* Lower card window */}
      <View
        style={{
          flex: 1,
          backgroundColor: colors.blood,
          borderRadius: OUTER_RADIUS,
          borderWidth: BORDER,
          borderColor: colors.blood,
          padding: PAD,
          // A tiny negative margin pulls them together so the rounded corners
          // form a perfect sideways notch without a flat gap between them.
          marginTop: -2,
          zIndex: 1,
        }}
      >
        {/*
          Deliberately UNPAINTED. The card fills this box and rounds its own
          corners, so whatever colour sits here is exactly what shows through
          those corners — and it has to be the ticket's red.
        */}
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    </View>
  );
}

export default DeckTicket;

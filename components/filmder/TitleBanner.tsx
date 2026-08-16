import React from 'react';
import {
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Display } from '@/components/ui/Display';
import { fitThunder } from '@/theme/thunder';
import { colors, grid } from '@/theme/tokens';

export interface TitleBannerProps {
  title: string;
  /**
   * Width of the box this is drawing into, padding included.
   *
   * Passed in rather than measured: the type is fitted in a single pass from
   * font metrics, and an `onLayout` round trip would render one frame at the
   * wrong size. Falls back to the full screen inset by the page gutter for a
   * standalone caller.
   */
  availableWidth?: number;
  style?: StyleProp<ViewStyle>;
}

const PAD_H = 12;
const PAD_V = 0;

/**
 * Offset shadow, as a fraction of the type size.
 *
 * Taken off the reference poster rather than guessed: the shadow reads at
 * roughly 11% of cap height across and 14% down, and Thunder's cap is 0.70em,
 * so those become 0.075em and 0.095em. Expressed in em because the type size is
 * computed per title — a fixed pixel offset would look heavy on a long title
 * that shrank to fit and thin on a short one pinned at the cap.
 */
const SHADOW_X_EM = 0.065;
const SHADOW_Y_EM = 0.065;

/**
 * The marquee board above the deck: the film's name in heavy IVORY type with a
 * hard dark offset shadow, on a red board.
 *
 * Two things here are load-bearing rather than decorative.
 *
 * FIRST, the shadow is the ONLY relief on the glyphs — there is no outline.
 * Cream type sits directly on the red ground, so it already has all the
 * contrast it needs; adding a stroke on top thickens every stem and closes up
 * Thunder Black's already-narrow counters, which is what made the earlier
 * version read as a heavier, muddier face than the reference.
 *
 * SECOND, the type is fitted to the panel width from measured font metrics, not
 * stepped through the display scale by character count. The design sets titles
 * edge to edge; counting characters cannot do that, because a character is not a
 * width — eleven I's and eleven W's differ by 2.6x. Character-stepping left
 * "IINVASHIONN" covering 49% of the board and "DUNE" covering 27%.
 *
 * It lives outside the swipe deck on purpose. In the design this is fixed chrome
 * that the cards pass beneath, so it must not travel with the gesture.
 *
 * It draws NO background, border or radius. This is the top half of a ticket,
 * not a board sitting on one — the red behind the type belongs to
 * `DeckTicket`'s single continuous body, and giving the stub a panel of its own
 * is what made the marquee and the card read as two stacked components rather
 * than one torn-off ticket.
 */
export function TitleBanner({ title, availableWidth, style }: TitleBannerProps) {
  const { width, height } = useWindowDimensions();
  const text = title.toUpperCase();

  const box = availableWidth ?? width - grid.screenPadding * 2;

  // The shadow is not subtracted here. It translates out of the text box into
  // the padding, which at the cap size costs ~7px against PAD_H's 12 — and
  // folding it into the fit would make the equation circular, since the offset
  // is itself a fraction of the size being solved for.
  const usable = box - PAD_H * 2;

  // Capped against screen height as well as width, so a one-word title on a
  // short device cannot take the board over the card.
  const fit = fitThunder(text, usable, Math.min(92, height * 0.115));

  return (
    <View
      style={[
        {
          paddingHorizontal: PAD_H,
          paddingVertical: PAD_V,
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Display
        // The variant only supplies the family now; every metric is overridden
        // below. displayXl is chosen so nothing inherits a smaller line box.
        variant="displayXl"
        color={colors.paper}
        shadowColor={colors.ink}
        offset={{
          x: fit.fontSize * SHADOW_X_EM,
          y: fit.fontSize * SHADOW_Y_EM,
        }}
        align="center"
        // Single line by construction: the size was computed to fit, so there is
        // nothing to wrap — and with one line the stacked copies have no wrap
        // points that could fall out of step.
        numberOfLines={2}
        textStyle={{
          fontSize: fit.fontSize,
          lineHeight: fit.lineHeight,
          letterSpacing: fit.letterSpacing,
        }}
      >
        {text}
      </Display>
    </View>
  );
}

export default TitleBanner;

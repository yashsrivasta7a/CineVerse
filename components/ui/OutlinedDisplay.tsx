import React from 'react';
import {
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { c, colors, displayShadowOffset } from '@/theme/tokens';
import type { TypeVariant } from '@/theme/typography';
import { Text } from './Text';

export type DisplayVariant = Extract<
  TypeVariant,
  'displayXl' | 'display' | 'displaySm' | 'displayXs'
>;

export interface OutlinedDisplayProps {
  children: string;
  variant?: DisplayVariant;
  /** Glyph fill. */
  color?: string;
  /** Hard outline drawn around every glyph. */
  outlineColor?: string;
  /** Stroke weight in px. Defaults to a per-variant value tuned to the cut. */
  outlineWidth?: number;
  /** Hard offset shadow behind the outline. `null` turns it off. */
  shadowColor?: string | null;
  offset?: { x: number; y: number };
  numberOfLines?: number;
  /** Horizontal alignment of the type inside its box. */
  align?: TextStyle['textAlign'];
  /**
   * Padding added around the whole block so the stroke and shadow, which stick
   * out past the text box, are not clipped by an ancestor with
   * `overflow: 'hidden'` or by an Android rounded-corner clip. Zero by default
   * because most callers already have panel padding to bleed into.
   */
  bleed?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/**
 * Eight unit vectors on a circle. Rendering the string once per direction and
 * unioning the results approximates dilating every glyph by a disc of radius
 * `outlineWidth` — i.e. a stroke. The diagonals are NORMALISED (0.707, not 1)
 * so corners sit the same distance out as the axes; using ±1 diagonals instead
 * pushes the corners out by a factor of √2 and the stroke reads lumpy on the
 * shoulders of round glyphs.
 *
 * Module scope, not a value built in render: this never varies, and the repo's
 * convention is to keep constant tables out of component bodies.
 */
const RING = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.7071, 0.7071],
  [0.7071, -0.7071],
  [-0.7071, 0.7071],
  [-0.7071, -0.7071],
] as const;

/**
 * Stroke weight per cut, roughly 5% of the type size. Tabulated rather than
 * computed so it can be tuned by eye — Thunder Black is ultra-condensed and its
 * counters close up fast if the stroke goes much heavier than this.
 */
const OUTLINE_BY_VARIANT: Record<DisplayVariant, number> = {
  displayXl: 3,
  display: 2,
  displaySm: 1.5,
  displayXs: 1,
};

/** Every copy behind the front one is decoration; screen readers see one string. */
const HIDDEN = {
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/**
 * Heavy display type with a hard dark outline around every glyph and a hard
 * offset shadow — the 1930s poster look, which is also what makes cream type
 * legible on the cream marquee panel.
 *
 * WHY THIS IS BUILT OUT OF DUPLICATED <Text> COPIES
 *
 * React Native has no text stroke. The three alternatives were checked against
 * the installed versions and each fails on one platform:
 *
 *   textShadow*  — one shadow only, so it cannot make an outline at all, and
 *     it is not even the same feature twice: iOS maps it to NSShadow, where
 *     `textShadowRadius: 0` is a crisp hard shadow, while Android maps it to
 *     `TextPaint.setShadowLayer(radius, dx, dy, color)`
 *     (ReactAndroid .../text/internal/span/ShadowStyleSpan.kt), and Android
 *     removes the shadow layer entirely when radius is 0. Same style, hard
 *     shadow on iOS, nothing on Android.
 *
 *   react-native-svg <Text stroke> — `stroke`/`strokeWidth` are real
 *     (TextSpecificProps extends CommonPathProps extends StrokeProps) but
 *     `paintOrder` is not implemented anywhere in 15.15.4, so the stroke always
 *     paints over the fill. Worse, SVG text does not participate in layout and
 *     only wraps via `inlineSize`, and the `inlineSize` path on iOS
 *     (apple/Text/RNSVGTSpan.mm, drawWrappedText) renders through a UILabel and
 *     applies the stroke colour as the label's TEXT colour — a wrapped, stroked
 *     string comes out solid outline-coloured on iOS and correctly stroked on
 *     Android.
 *
 *   filter: [{ dropShadow }] — Android implements `filter` with RenderEffect
 *     (uimanager/FilterHelper.kt), which is API 31+; below Android 12 it is a
 *     no-op. It is also still a shadow, not a stroke.
 *
 * WHY EVERY COPY IS absoluteFill + transform
 *
 * `absoluteFill` inherits the exact box the front copy established, so all
 * copies wrap at identical points. Offsetting with `left`/`top` instead gives
 * each copy a different box width, which desynchronises the line breaks and
 * reads as overlapping text — worst inside a shrink-to-fit parent, where the
 * box has no intrinsic width. `transform` moves pixels without touching layout,
 * so it cannot reintroduce that bug.
 *
 * The copies live in an inner unpadded View rather than in the `style` View for
 * the same reason: padding on the absolute container makes `absoluteFill` span
 * the padding box while the front copy only spans the content box.
 *
 * Cost: `outlineWidth > 0` renders 10 <Text> nodes (1 shadow + 8 ring + 1
 * fill). Each measures independently — there is no shared measure cache in RN
 * 0.86 on Android — but a <= 30 character single-fragment string is trivial to
 * lay out, and nothing here re-renders during a swipe. If a low-end device does
 * show jank on card change, halve `RING` to the four diagonals before reaching
 * for anything more exotic.
 *
 * Do NOT add `adjustsFontSizeToFit`: each copy would auto-size against its own
 * box and the sizes can diverge. Step the variant by title length instead, the
 * way `components/filmder/TitleBanner.tsx` already does.
 */
export function OutlinedDisplay({
  children,
  variant = 'display',
  color = c.text,
  outlineColor = colors.inkDeep,
  outlineWidth,
  shadowColor = colors.noir,
  offset = displayShadowOffset,
  numberOfLines,
  align,
  bleed = 0,
  style,
  textStyle,
}: OutlinedDisplayProps) {
  const stroke = outlineWidth ?? OUTLINE_BY_VARIANT[variant];
  const shared: StyleProp<TextStyle> = [align ? { textAlign: align } : null, textStyle];

  return (
    <View style={[bleed > 0 ? { padding: bleed } : null, style]}>
      {/* Unpadded on purpose — this is the box absoluteFill resolves against. */}
      <View>
        {/*
          The shadow copy is a plain silhouette, not a second stroked ring: with
          a dark outline and a dark shadow the two merge into one mass, so the
          extra eight nodes would buy nothing. It does mean the shadow only
          shows where the offset clears the stroke — keep the offset larger than
          `outlineWidth` or it disappears underneath.
        */}
        {shadowColor ? (
          <Text
            variant={variant}
            color={shadowColor}
            numberOfLines={numberOfLines}
            {...HIDDEN}
            style={[
              StyleSheet.absoluteFill,
              { transform: [{ translateX: offset.x }, { translateY: offset.y }] },
              shared,
            ]}
          >
            {children}
          </Text>
        ) : null}

        {stroke > 0
          ? RING.map(([dx, dy]) => (
            <Text
              key={`${dx},${dy}`}
              variant={variant}
              color={outlineColor}
              numberOfLines={numberOfLines}
              {...HIDDEN}
              style={[
                StyleSheet.absoluteFill,
                {
                  transform: [
                    { translateX: dx * stroke },
                    { translateY: dy * stroke },
                  ],
                },
                shared,
              ]}
            >
              {children}
            </Text>
          ))
          : null}

        <Text variant={variant} color={color} numberOfLines={numberOfLines} style={shared}>
          {children}
        </Text>
      </View>
    </View>
  );
}

export default OutlinedDisplay;

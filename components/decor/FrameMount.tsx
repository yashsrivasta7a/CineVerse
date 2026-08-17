import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { FilmStrip } from './FilmStrip';
import { colors, radius } from '@/theme/tokens';

export interface FrameMountProps {
  uri: string | null;
  /** Width ÷ height of the image window. The sprocket margins sit outside it. */
  aspect?: number;
  /** Height of each sprocket margin. */
  strip?: number;
  /** Sprocket spacing. Scale it with `strip` or the perforation reads wrong. */
  pitch?: number;
  corner?: number;
  /** Overlays — a slate, a stamp — positioned against the image window. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * A still mounted as one frame of film: the image window with a perforated
 * margin above and below it.
 *
 * This is the page's structural claim, not decoration. An episode IS a frame in
 * a reel — it has an ordinal position in a strip that runs in one direction —
 * so the same mount renders the hero, the contact sheet and every chip in the
 * scrubber, and the three read as the same object at three magnifications.
 *
 * Sprockets run top and bottom rather than down the sides because every strip
 * on this page runs horizontally. Put them on the sides and the frame is
 * claiming the reel travels vertically, which contradicts the scrubber it sits
 * above.
 */
export function FrameMount({
  uri,
  aspect = 16 / 9,
  strip = 12,
  pitch = 20,
  corner = radius.sm,
  children,
  style,
}: FrameMountProps) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.noir,
          borderRadius: corner,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <FilmStrip height={strip} pitch={pitch} />

      <View style={{ aspectRatio: aspect, backgroundColor: colors.inkDeep }}>
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons
              name="film-outline"
              size={Math.max(16, strip * 2)}
              color={colors.paperDeep}
            />
          </View>
        )}

        {children}
      </View>

      <FilmStrip height={strip} pitch={pitch} />
    </View>
  );
}

export default FrameMount;

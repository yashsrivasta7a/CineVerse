import React, { useEffect, useRef } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';

import { FrameMount } from './FrameMount';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { stillUrl } from '@/lib/api/tmdb/images';
import type { TmdbEpisode } from '@/lib/api/tmdb/types';
import { colors, grid, radius } from '@/theme/tokens';

const CHIP_WIDTH = 92;
const CHIP_GAP = 8;
/** The blood rail that reads as a sprocket edge on the frame you are on. */
const RAIL = 3;

export interface ReelScrubberProps {
  episodes: TmdbEpisode[];
  /** `episode_number` of the frame currently under the gate. */
  current: number;
  onSelect: (episodeNumber: number) => void;
  isWatched?: (episodeNumber: number) => boolean;
}

/**
 * The season, as the reel it is: every episode a frame on one strip, the one
 * you are watching held in a blood rail, any of them a tap away.
 *
 * This replaces a prev/next pair as the primary way to move between episodes,
 * and it is a better answer for the same reason a contact sheet beats a stack
 * of prints — you can see where you are in the run, how much of it is left, and
 * what you have already struck off, all without leaving the frame you are on.
 * The arrows still exist above it for the single-step case.
 *
 * Scrolls itself so the current frame lands mid-screen on mount. Without that,
 * arriving at episode 19 of 24 puts you at the head of a strip whose live frame
 * is off-screen to the right.
 */
export function ReelScrubber({
  episodes,
  current,
  onSelect,
  isWatched,
}: ReelScrubberProps) {
  const scroller = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();

  const index = episodes.findIndex((e) => e.episode_number === current);

  useEffect(() => {
    if (index < 0) return;

    const stride = CHIP_WIDTH + CHIP_GAP;
    const centred =
      index * stride + grid.screenPadding - screenWidth / 2 + CHIP_WIDTH / 2;

    // No animation: this runs on mount, and a strip that visibly slides into
    // place every time you open an episode reads as a loading artifact.
    scroller.current?.scrollTo({ x: Math.max(0, centred), animated: false });
  }, [index, screenWidth]);

  if (!episodes.length) return null;

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: grid.screenPadding,
        gap: CHIP_GAP,
      }}
    >
      {episodes.map((episode) => {
        const active = episode.episode_number === current;
        const watched = isWatched?.(episode.episode_number) ?? false;

        return (
          <PressableScale
            key={episode.id}
            onPress={() => {
              if (active) return;
              onSelect(episode.episode_number);
            }}
            scaleTo={0.93}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Episode ${episode.episode_number}, ${episode.name}`}
            style={{ width: CHIP_WIDTH, gap: 5 }}
          >
            <View
              style={{
                padding: RAIL,
                borderRadius: radius.sm + RAIL,
                backgroundColor: active ? colors.blood : colors.noir,
                // Unwatched frames stay at full strength; struck-off ones sit
                // back, so the strip shows your progress at a glance.
                opacity: watched && !active ? 0.5 : 1,
              }}
            >
              <FrameMount
                uri={stillUrl(episode.still_path, 'w185')}
                strip={5}
                pitch={9}
              />
            </View>

            <Text
              variant="osd"
              color={active ? colors.blood : colors.paperDeep}
              numberOfLines={1}
              style={{ textAlign: 'center' }}
            >
              E{String(episode.episode_number).padStart(2, '0')}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

export default ReelScrubber;

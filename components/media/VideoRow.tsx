import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import type { TmdbVideo } from '@/lib/api/tmdb/types';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

export interface VideoRowProps {
  videos: TmdbVideo[];
  limit?: number;
}

/** Types worth surfacing. A "Behind the Scenes" clip is not a trailer. */
const WANTED = ['Trailer', 'Teaser', 'Featurette', 'Clip'];

/**
 * "On video" — trailers, teasers and featurettes.
 *
 * The masterplan labels this section "Reviews from bloggers". There is no
 * blogger corpus behind it, and inventing bylines for TMDB's video list would
 * be a fabrication, so the section keeps the layout and takes an honest name.
 *
 * Thumbnails come straight from YouTube's still endpoint, which needs no API
 * key and no extra request against TMDB's budget.
 */
export function VideoRow({ videos, limit = 10 }: VideoRowProps) {
  const visible = useMemo(
    () =>
      videos
        .filter((video) => video.site === 'YouTube' && WANTED.includes(video.type))
        .sort((a, b) => Number(b.official) - Number(a.official))
        .slice(0, limit),
    [videos, limit]
  );

  if (!visible.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: grid.screenPadding, gap: 12 }}
    >
      {visible.map((video) => (
        <PressableScale
          key={video.id}
          onPress={() =>
            WebBrowser.openBrowserAsync(`https://www.youtube.com/watch?v=${video.key}`)
          }
          accessibilityRole="link"
          accessibilityLabel={`Play ${video.name}`}
          style={{ width: 224, gap: 8 }}
        >
          <View
            style={{
              width: 224,
              height: 126,
              borderRadius: radius.md,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: colors.noir,
              backgroundColor: colors.inkRaised,
            }}
          >
            <Image
              source={{ uri: `https://img.youtube.com/vi/${video.key}/mqdefault.jpg` }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={180}
              cachePolicy="memory-disk"
            />

            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: colors.blood,
                  borderWidth: 2,
                  borderColor: colors.paper,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="play" size={20} color={colors.paper} style={{ marginLeft: 3 }} />
              </View>
            </View>

            <View
              style={{
                position: 'absolute',
                left: 8,
                bottom: 8,
                backgroundColor: withAlpha(colors.noir, 0.75),
                borderRadius: radius.sm,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}
            >
              <Text variant="osd" color={colors.paper}>{video.type}</Text>
            </View>
          </View>

          <Text variant="chip" numberOfLines={2}>{video.name}</Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}

export default VideoRow;

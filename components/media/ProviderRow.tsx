import { Image } from 'expo-image';
import { Linking, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { logoUrl } from '@/lib/api/tmdb/images';
import {
  PROVIDER_KIND_LABEL,
  type ResolvedProviders,
} from '@/lib/api/tmdb/providers';
import { colors, radius, withAlpha } from '@/theme/tokens';

export interface ProviderRowProps {
  data: ResolvedProviders;
  region?: string;
}

/**
 * Where to watch, with real provider logos.
 *
 * These come free inside the detail request's `append_to_response`, which is
 * what let the separate Watchmode integration go: one fewer API key in the
 * bundle, no 1000-request monthly quota, and artwork instead of bare names.
 *
 * TMDB requires the JustWatch attribution link to be surfaced, which is what
 * the footer row is.
 */
export function ProviderRow({ data, region }: ProviderRowProps) {
  if (!data.providers.length) return null;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {data.providers.map((provider) => {
          const uri = logoUrl(provider.logo_path, 'w92');

          return (
            <PressableScale
              key={`${provider.kind}-${provider.provider_id}`}
              onPress={() => {
                if (data.link) Linking.openURL(data.link);
              }}
              scaleTo={0.92}
              accessibilityRole="link"
              accessibilityLabel={`Watch on ${provider.provider_name} (via JustWatch)`}
              style={{ width: 64, alignItems: 'center', gap: 5 }}
            >
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: radius.md,
                  overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: colors.noir,
                  backgroundColor: colors.inkRaised,
                }}
              >
                {uri ? (
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={150}
                    cachePolicy="memory-disk"
                  />
                ) : null}
              </View>

              <Text
                variant="osd"
                color={withAlpha(colors.paper, 0.65)}
                numberOfLines={1}
                style={{ textAlign: 'center' }}
              >
                {PROVIDER_KIND_LABEL[provider.kind]}
              </Text>
            </PressableScale>
          );
        })}
      </View>

      {data.link ? (
        <PressableScale
          onPress={() => Linking.openURL(data.link!)}
          scaleTo={0.98}
          accessibilityRole="link"
          accessibilityLabel="See all watch options on JustWatch"
          style={{
            alignSelf: 'flex-start',
            borderRadius: radius.pill,
            borderWidth: 1.5,
            borderColor: withAlpha(colors.paper, 0.35),
            paddingHorizontal: 14,
            paddingVertical: 7,
          }}
        >
          <Text variant="osd" color={withAlpha(colors.paper, 0.8)}>
            All options{region ? ` · ${region}` : ''} — JustWatch
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}

export default ProviderRow;

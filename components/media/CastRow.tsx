import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { profileUrl } from '@/lib/api/tmdb/images';
import { usePrefs } from '@/lib/store/prefs';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

export interface CastMemberLike {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export interface CastRowProps {
  cast: CastMemberLike[];
  limit?: number;
}

/**
 * Cast, with blocking built in.
 *
 * Tap opens the person; LONG-PRESS blocks them. Blocking writes a `block`
 * stance, which `paramsFromPrefs` folds into the deck's exclusion set — so the
 * gesture has a real consequence rather than being a local hide.
 *
 * /discover has no `without_cast`, so the exclusion is applied client-side at
 * card hydration. That is a TMDB limitation, not an implementation shortcut.
 */
export function CastRow({ cast, limit = 20 }: CastRowProps) {
  const router = useRouter();
  const entries = usePrefs((state) => state.entries);
  const setStance = usePrefs((state) => state.setStance);
  const clear = usePrefs((state) => state.clear);

  const visible = cast.slice(0, limit);
  if (!visible.length) return null;

  const isBlocked = (id: number) => entries[`person:${id}`]?.stance === 'block';

  const toggleBlock = (member: CastMemberLike) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isBlocked(member.id)) {
      clear('person', String(member.id));
      return;
    }

    Alert.alert(
      `Block ${member.name}?`,
      'Films featuring them stop appearing in your deck. You can undo this in Profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            setStance('person', String(member.id), 'block', member.name, member.profile_path),
        },
      ]
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: grid.screenPadding, gap: 12 }}
    >
      {visible.map((member) => {
        const uri = profileUrl(member.profile_path, 'w185');
        const blocked = isBlocked(member.id);

        return (
          <PressableScale
            key={`${member.id}-${member.character}`}
            onPress={() => router.push(`/person/${member.id}` as never)}
            onLongPress={() => toggleBlock(member)}
            delayLongPress={400}
            accessibilityRole="button"
            accessibilityLabel={
              blocked
                ? `${member.name}, blocked. Long press to unblock`
                : `${member.name} as ${member.character}. Long press to block`
            }
            style={{ width: 84, gap: 6 }}
          >
            <View
              style={{
                width: 84,
                height: 84,
                borderRadius: 42,
                overflow: 'hidden',
                borderWidth: 2.5,
                borderColor: blocked ? colors.blood : colors.noir,
                backgroundColor: colors.inkRaised,
                opacity: blocked ? 0.45 : 1,
              }}
            >
              {uri ? (
                <Image
                  source={{ uri }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={160}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="person" size={28} color={withAlpha(colors.paper, 0.5)} />
                </View>
              )}
            </View>

            {blocked ? (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  backgroundColor: colors.blood,
                  borderRadius: radius.pill,
                  borderWidth: 2,
                  borderColor: colors.paper,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Ionicons name="ban" size={11} color={colors.paper} />
              </View>
            ) : null}

            <Text variant="chip" numberOfLines={1} style={{ textAlign: 'center' }}>
              {member.name}
            </Text>
            <Text
              variant="osd"
              color={withAlpha(colors.paper, 0.45)}
              numberOfLines={1}
              style={{ textAlign: 'center', marginTop: -3 }}
            >
              {member.character}
            </Text>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

export default CastRow;

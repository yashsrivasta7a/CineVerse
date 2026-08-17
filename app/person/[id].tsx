import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, View } from 'react-native';

import { FilmStrip } from '@/components/kino/FilmStrip';
import { PosterCard } from '@/components/media/PosterCard';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { getPerson } from '@/lib/api/tmdb/people';
import { profileUrl } from '@/lib/api/tmdb/images';
import { normalizeMovie, normalizeTv } from '@/lib/api/tmdb/normalize';
import type { Title } from '@/lib/api/tmdb/types';
import { useGridWidth } from '@/lib/hooks/useGridWidth';
import { qk } from '@/lib/queries/keys';
import { usePrefs } from '@/lib/store/prefs';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { itemWidth, gutter } = useGridWidth(3);
  const [bioExpanded, setBioExpanded] = useState(false);

  const stance = usePrefs((state) => state.entries[`person:${id}`]?.stance);
  const setStance = usePrefs((state) => state.setStance);
  const clear = usePrefs((state) => state.clear);

  const { data: person, isPending, error } = useQuery({
    queryKey: qk.person(id ?? ''),
    queryFn: ({ signal }) => getPerson(id!, signal),
    enabled: !!id,
  });

  /**
   * `combined_credits` mixes movies and shows in one array, distinguished only
   * by which title field they carry — so branch on that and normalize each
   * through the right converter rather than guessing.
   */
  const credits = useMemo<Title[]>(() => {
    const cast = person?.combined_credits?.cast ?? [];
    const seen = new Set<number>();

    return cast
      .map((entry) =>
        'title' in entry
          ? normalizeMovie(entry as never)
          : normalizeTv(entry as never)
      )
      .filter((title) => {
        if (!title.posterPath || seen.has(title.id)) return false;
        seen.add(title.id);
        return true;
      })
      .sort((a, b) => b.voteCount - a.voteCount)
      .slice(0, 30);
  }, [person]);

  const blocked = stance === 'block';

  const toggleBlock = () => {
    if (!person) return;
    if (blocked) {
      clear('person', String(person.id));
      return;
    }
    Alert.alert(
      `Block ${person.name}?`,
      'They stop being used to build your rails. Undo it any time under Blocked in Profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () =>
            setStance('person', String(person.id), 'block', person.name, person.profile_path),
        },
      ]
    );
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        <View style={{ paddingHorizontal: grid.screenPadding, paddingTop: 6 }}>
          <PressableScale
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.inkRaised,
              borderWidth: 2,
              borderColor: colors.noir,
            }}
          >
            <Ionicons name="arrow-back" size={19} color={colors.paper} />
          </PressableScale>
        </View>

        {isPending ? (
          <ActivityIndicator size="large" color={colors.blood} style={{ marginTop: 60 }} />
        ) : error || !person ? (
          <Text
            variant="body"
            color={withAlpha(colors.paper, 0.7)}
            style={{ textAlign: 'center', marginTop: 60 }}
          >
            Couldn&apos;t load this profile.
          </Text>
        ) : (
          <>
            <View
              style={{
                paddingHorizontal: grid.screenPadding,
                marginTop: 14,
                flexDirection: 'row',
                gap: 16,
                alignItems: 'flex-start',
              }}
            >
              <View
                style={{
                  width: 108,
                  height: 108,
                  borderRadius: 54,
                  overflow: 'hidden',
                  borderWidth: 3,
                  borderColor: blocked ? colors.blood : colors.paper,
                  backgroundColor: colors.inkRaised,
                  opacity: blocked ? 0.5 : 1,
                }}
              >
                {person.profile_path ? (
                  <Image
                    source={{ uri: profileUrl(person.profile_path, 'w185')! }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={180}
                    cachePolicy="memory-disk"
                  />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person" size={36} color={withAlpha(colors.paper, 0.5)} />
                  </View>
                )}
              </View>

              <View style={{ flex: 1, gap: 8 }}>
                <Display variant="displaySm" numberOfLines={3}>{person.name}</Display>
                <Text variant="osd" color={withAlpha(colors.paper, 0.5)}>
                  {[person.known_for_department, person.place_of_birth]
                    .filter(Boolean)
                    .join('  ·  ')}
                </Text>

                <PressableScale
                  onPress={toggleBlock}
                  scaleTo={0.96}
                  accessibilityRole="button"
                  accessibilityLabel={blocked ? `Unblock ${person.name}` : `Block ${person.name}`}
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    backgroundColor: blocked ? colors.blood : 'transparent',
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    borderColor: blocked ? colors.blood : withAlpha(colors.paper, 0.4),
                    paddingHorizontal: 13,
                    paddingVertical: 7,
                  }}
                >
                  <Ionicons
                    name={blocked ? 'ban' : 'ban-outline'}
                    size={13}
                    color={colors.paper}
                  />
                  <Text variant="osd" color={colors.paper}>
                    {blocked ? 'Blocked' : 'Block'}
                  </Text>
                </PressableScale>
              </View>
            </View>

            {person.biography ? (
              <View style={{ paddingHorizontal: grid.screenPadding, marginTop: 20, gap: 10 }}>
                <Text
                  variant="body"
                  color={withAlpha(colors.paper, 0.78)}
                  numberOfLines={bioExpanded ? undefined : 6}
                >
                  {person.biography}
                </Text>

                {person.biography.length > 300 ? (
                  <PressableScale
                    onPress={() => setBioExpanded((previous) => !previous)}
                    scaleTo={0.96}
                    accessibilityRole="button"
                    accessibilityLabel={bioExpanded ? 'Show less' : 'Read more'}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    <Text variant="osd" color={colors.blood}>
                      {bioExpanded ? 'Less' : 'Read more'}
                    </Text>
                  </PressableScale>
                ) : null}
              </View>
            ) : null}

            <FilmStrip
              height={10}
              pitch={16}
              style={{ marginTop: 22, marginHorizontal: grid.screenPadding }}
            />

            {credits.length ? (
              <View style={{ marginTop: 20, gap: 14 }}>
                <Display
                  variant="displaySm"
                  style={{ paddingHorizontal: grid.screenPadding }}
                >
                  Known for
                </Display>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: gutter,
                    rowGap: 20,
                    paddingHorizontal: grid.screenPadding,
                  }}
                >
                  {credits.map((title) => (
                    <PosterCard key={`${title.mediaType}-${title.id}`} title={title} style={{ width: itemWidth }} />
                  ))}
                </View>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

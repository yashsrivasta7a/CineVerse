import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { SignOutButton } from '@/components/sign-out-button';
import { clearVerdicts, getTasteSignals, getVerdictCounts } from '@/db/queries/verdicts';
import { useGenres } from '@/lib/queries/reference';
import { MOOD_STOPS } from '@/lib/recommend/moods';
import { buildVector, topGenres } from '@/lib/recommend/taste';
import { selectByFacet, usePrefs } from '@/lib/store/prefs';
import { colors, grid, radius } from '@/theme/tokens';
import { fontFamily } from '@/theme/typography';

/** Verdicts before learning is allowed to shape the deck's query. */
const LEARNING_AT = 12;

/** ISO 639-1 -> display name. Unlisted codes fall back to the code itself. */
const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', ko: 'Korean', ja: 'Japanese', es: 'Spanish',
  fr: 'French', de: 'German', it: 'Italian', ta: 'Tamil', te: 'Telugu',
  zh: 'Chinese', pt: 'Portuguese', ml: 'Malayalam', kn: 'Kannada', mr: 'Marathi',
};

/** Highest-affinity key of one vector axis, or null while nothing is positive. */
function topOf(axis: Record<string, number>): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const [key, score] of Object.entries(axis)) {
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

/**
 * One number and what it counts.
 *
 * `flex: 1` rather than intrinsic width, so the three columns stay on one grid
 * whatever their digits — sized to content, the row re-flowed every time a
 * count crossed ten and the labels stopped lining up.
 */
function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={{ flex: 1, gap: 3 }}>
      <Text
        color={colors.paper}
        style={{ fontFamily: fontFamily.displayAlt, fontSize: 30, lineHeight: 32 }}
      >
        {value}
      </Text>
      <Text variant="osd" color={colors.paperMuted} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/**
 * A tappable row.
 *
 * Rows butt against each other into one block rather than floating as separate
 * cards: only the outer corners are rounded, and only the outer edges carry a
 * border. Five individually-bordered cards made five competing rectangles out
 * of what is one list.
 */
function Row({
  icon,
  label,
  detail,
  onPress,
  danger,
  first,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
  danger?: boolean;
  first?: boolean;
  last?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        minHeight: 58,
        paddingHorizontal: 16,
        backgroundColor: colors.inkRaised,
        borderColor: colors.noir,
        borderWidth: 2,
        borderTopWidth: first ? 2 : 0,
        borderTopLeftRadius: first ? radius.md : 0,
        borderTopRightRadius: first ? radius.md : 0,
        borderBottomLeftRadius: last ? radius.md : 0,
        borderBottomRightRadius: last ? radius.md : 0,
      }}
    >
      <Ionicons
        name={icon}
        size={19}
        color={danger ? colors.paperMuted : colors.blood}
        style={{ width: 22, textAlign: 'center' }}
      />

      <Text
        variant="heading"
        color={danger ? colors.paperMuted : colors.paper}
        style={{ flex: 1 }}
        numberOfLines={1}
      >
        {label}
      </Text>

      {detail ? (
        <Text variant="osd" color={colors.paperMuted} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}

      <Ionicons name="chevron-forward" size={17} color={colors.paperMuted} />
    </PressableScale>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <Text variant="label" color={colors.paperMuted} style={{ marginTop: 34, marginBottom: 12 }}>
      {children}
    </Text>
  );
}

export default function ProfileScreen() {
  const { user } = useUser();
  const router = useRouter();

  const entries = usePrefs((state) => state.entries);
  const resetAll = usePrefs((state) => state.resetAll);
  const clearPref = usePrefs((state) => state.clear);
  const mood = usePrefs((state) => state.mood);

  const { data: genreList } = useGenres('movie');

  const likedGenres = selectByFacet(entries, 'genre', 'like').length;
  const likedActors = selectByFacet(entries, 'person', 'like').length;

  /**
   * Everyone the user has blocked, so the promise the block dialog makes —
   * "undo it any time under Blocked in Profile" — is actually true. It had no
   * home before this, which made the only way back re-finding the person in a
   * cast list.
   */
  const blocked = useMemo(
    () => [
      ...selectByFacet(entries, 'person', 'block'),
      ...selectByFacet(entries, 'person', 'dislike'),
    ],
    [entries]
  );

  /**
   * The same vector the deck learns into, summarised for its owner. Built at
   * mount, which is fresh enough: this screen is pushed, so it remounts on
   * every visit.
   */
  const taste = useMemo(() => {
    const vector = buildVector(getTasteSignals('movie'));
    const decade = topOf(vector.decades);
    const language = topOf(vector.languages);

    return {
      samples: vector.samples,
      genres: topGenres(vector, 3)
        .map((id) => genreList?.find((genre) => String(genre.id) === id)?.name)
        .filter((name): name is string => !!name),
      decade: decade ? `${decade}s` : null,
      language: language ? LANG_NAMES[language] ?? language.toUpperCase() : null,
      counts: getVerdictCounts(),
    };
  }, [genreList]);

  const learned = taste.samples >= LEARNING_AT;
  const progress = Math.min(1, taste.samples / LEARNING_AT);

  const redoOnboarding = () => {
    // One tap here used to silently wipe every stated preference — the most
    // destructive action in the app, behind a row labelled "Taste preferences".
    Alert.alert(
      'Redo your taste setup?',
      'Your chosen countries, genres and actors will be cleared and onboarding starts over. Swipe history stays.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start over',
          style: 'destructive',
          onPress: () => {
            resetAll();
            router.replace('/' as never);
          },
        },
      ]
    );
  };

  const forgetSwipes = () => {
    Alert.alert(
      'Forget what the deck learned?',
      `All ${taste.counts.total} swipe verdicts will be deleted. The deck starts fresh and films you have already judged can appear again. Your vault and your chosen preferences stay.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: () => {
            clearVerdicts();
            router.replace('/' as never);
          },
        },
      ]
    );
  };

  const initial =
    user?.firstName?.[0]?.toUpperCase() ??
    user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() ??
    '?';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  return (
    <Screen>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: grid.screenPadding,
          paddingTop: 8,
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity: avatar, name, edit — three items on one baseline. The
            ticket graphic that used to wrap this said nothing about a profile
            and forced the edit control down into a settings row nobody found. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {user?.imageUrl ? (
            <Image
              source={{ uri: user.imageUrl }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                borderWidth: 2,
                borderColor: colors.paper,
              }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: colors.blood,
                borderWidth: 2,
                borderColor: colors.paper,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                color={colors.paper}
                style={{ fontFamily: fontFamily.display, fontSize: 30 }}
              >
                {initial}
              </Text>
            </View>
          )}

          <View style={{ flex: 1, gap: 2 }}>
            <Text
              color={colors.paper}
              numberOfLines={1}
              style={{ fontFamily: fontFamily.displayAlt, fontSize: 28, lineHeight: 30 }}
            >
              {user?.fullName || user?.firstName || 'Guest'}
            </Text>
            <Text variant="osd" color={colors.paperMuted} numberOfLines={1}>
              Member since {memberSince}
            </Text>
          </View>

          <PressableScale
            onPress={() => router.push('/profile-settings/edit-profile' as never)}
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel="Edit your name"
            hitSlop={10}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.inkRaised,
              borderWidth: 2,
              borderColor: colors.noir,
            }}
          >
            <Ionicons name="pencil" size={17} color={colors.paper} />
          </PressableScale>
        </View>

        {/* Three counts on one grid. */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: 26,
            paddingVertical: 16,
            borderTopWidth: 2,
            borderBottomWidth: 2,
            borderColor: colors.inkRaised,
          }}
        >
          <Stat value={taste.counts.total} label="Judged" />
          <Stat value={taste.counts.up} label="Saved or liked" />
          <Stat value={taste.counts.seen} label="Watched" />
        </View>

        {/* What the deck has learned, said back to its owner. Legibility is the
            feature — every recommender learns, almost none show their work. */}
        <SectionLabel>What the deck knows</SectionLabel>

        <View
          style={{
            backgroundColor: colors.inkRaised,
            borderRadius: radius.md,
            borderWidth: 2,
            borderColor: colors.noir,
            padding: 16,
            gap: 14,
          }}
        >
          {learned ? (
            <>
              {taste.genres.length > 0 ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {taste.genres.map((name) => (
                    <View
                      key={name}
                      style={{
                        backgroundColor: colors.blood,
                        borderRadius: radius.pill,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Text variant="label" color={colors.paper}>{name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text variant="bodySm" color={colors.paper}>
                  No strong genre lean yet — keep swiping.
                </Text>
              )}

              {taste.decade || taste.language ? (
                <Text variant="bodySm" color={colors.paperMuted}>
                  {[
                    taste.decade ? `Mostly ${taste.decade}` : null,
                    taste.language ? `${taste.language} first` : null,
                  ]
                    .filter(Boolean)
                    .join('  ·  ')}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <Text variant="bodySm" color={colors.paper}>
                {taste.samples === 0
                  ? 'Swipe in Flicks and the deck starts tuning itself to you.'
                  : `${LEARNING_AT - taste.samples} more swipe${
                      LEARNING_AT - taste.samples === 1 ? '' : 's'
                    } and the deck starts tuning itself to you.`}
              </Text>

              {/* A real bar against the real threshold in lib/recommend/taste.ts
                  — below 12 verdicts the sample is noise and nothing is applied,
                  so saying so beats pretending. */}
              <View
                style={{
                  height: 8,
                  borderRadius: radius.pill,
                  backgroundColor: colors.ink,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${progress * 100}%`,
                    height: '100%',
                    backgroundColor: colors.blood,
                  }}
                />
              </View>
            </>
          )}
        </View>

        {/* Only rendered once there is something to undo — an empty heading over
            nothing reads as a broken screen. */}
        {blocked.length > 0 ? (
          <>
            <SectionLabel>Blocked</SectionLabel>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {blocked.map((entry) => (
                <PressableScale
                  key={entry.value}
                  onPress={() => clearPref('person', entry.value)}
                  scaleTo={0.95}
                  accessibilityRole="button"
                  accessibilityLabel={`Unblock ${entry.label ?? 'this person'}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 38,
                    backgroundColor: colors.inkRaised,
                    borderRadius: radius.pill,
                    borderWidth: 2,
                    borderColor: colors.noir,
                    paddingLeft: 14,
                    paddingRight: 10,
                  }}
                >
                  <Text variant="chip" color={colors.paper}>
                    {entry.label ?? `#${entry.value}`}
                  </Text>
                  <Ionicons name="close" size={14} color={colors.blood} />
                </PressableScale>
              ))}
            </View>
          </>
        ) : null}

        <SectionLabel>Tuning</SectionLabel>

        <View>
          <Row
            first
            icon="pulse-outline"
            label="Tonight's mood"
            detail={mood === null ? 'Not set' : MOOD_STOPS[mood]}
            onPress={() => router.push('/mood' as never)}
          />
          <Row
            icon="funnel-outline"
            label="Filters"
            onPress={() => router.push('/filters' as never)}
          />
          <Row
            icon="options-outline"
            label="Redo taste setup"
            detail={`${likedGenres} genres · ${likedActors} actors`}
            onPress={redoOnboarding}
          />
          <Row
            last
            danger
            icon="refresh-outline"
            label="Forget swipe history"
            detail={String(taste.counts.total)}
            onPress={forgetSwipes}
          />
        </View>

        <View style={{ marginTop: 28 }}>
          <SignOutButton />
        </View>
      </ScrollView>
    </Screen>
  );
}

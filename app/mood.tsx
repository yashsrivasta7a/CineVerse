import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { MoodDial } from '@/components/media/MoodDial';
import { MOOD_PROFILES, MOOD_STOPS } from '@/lib/recommend/moods';
import { SplitFlap } from '@/components/media/SplitFlap';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { usePrefs } from '@/lib/store/prefs';
import { colors, grid, radius } from '@/theme/tokens';

/** Underdamped, so the marquee lamps settle with a flicker rather than a step. */
const SPRING = { damping: 15, stiffness: 140, mass: 0.8 } as const;

/** Bulbs along the top and bottom rails of the marquee. */
const BULBS = 11;

/**
 * One rail of marquee bulbs, brightening with the mood.
 *
 * Every bulb reads the same shared value but crosses its own threshold, so the
 * rail lights up progressively from the centre out instead of switching as a
 * block — the difference between a sign warming up and a sign being toggled.
 */
function BulbRail({ energy }: { energy: SharedValue<number> }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 6,
      }}
    >
      {Array.from({ length: BULBS }).map((_, index) => (
        <Bulb key={index} index={index} energy={energy} />
      ))}
    </View>
  );
}

function Bulb({ index, energy }: { index: number; energy: SharedValue<number> }) {
  // Distance from the centre, 0 at the middle bulb and 1 at either end.
  const offset = Math.abs(index - (BULBS - 1) / 2) / ((BULBS - 1) / 2);

  const style = useAnimatedStyle(() => {
    const lit = Math.max(0, Math.min(1, (energy.value - offset * 0.55) / 0.45));
    return {
      opacity: 0.22 + lit * 0.78,
      transform: [{ scale: 0.72 + lit * 0.28 }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          width: 9,
          height: 9,
          borderRadius: 4.5,
          backgroundColor: colors.paper,
          borderWidth: 1,
          borderColor: colors.noir,
        },
        style,
      ]}
    />
  );
}

const BackgroundPattern = () => {
  const line = 'NOW SHOWING · NOW SHOWING · '.repeat(4);
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          overflow: 'hidden',
          opacity: 0.04,
          transform: [{ rotate: '-12deg' }, { scale: 1.5 }],
          alignItems: 'center',
          justifyContent: 'center',
        },
      ]}
      pointerEvents="none"
    >
      {Array.from({ length: 30 }).map((_, i) => (
        <Text
          key={i}
          variant="displayXl"
          color={colors.paper}
          style={{ fontSize: 28, lineHeight: 32, opacity: i % 2 === 0 ? 1 : 0.4 }}
          numberOfLines={1}
        >
          {line}
        </Text>
      ))}
    </View>
  );
};

/**
 * The mood, as the marquee of a picture house.
 *
 * This replaced a grid of hot-linked imgflip meme JPEGs. They were third-party
 * URLs on someone else's CDN, they had nothing to do with the films the mood
 * actually selects, and the screen could not render at all offline. A marquee
 * needs no network, states the value it is reporting, and is an object this
 * app's own subject already owns.
 */
export default function MoodScreen() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const storedMood = usePrefs((state) => state.mood);
  const setMood = usePrefs((state) => state.setMood);

  const [draft, setDraft] = useState<number>(storedMood ?? 2);

  /**
   * The screen's animation, in one number: 0 at the bottom stop, 1 at the top.
   * `useDerivedValue` rather than an effect for the reason the tab bar and the
   * poster skeleton use it — writing a shared value from an effect puts it in a
   * dependency array, which the React Compiler's immutability rule rejects.
   */
  const energy = useDerivedValue(() => {
    const target = draft / (MOOD_STOPS.length - 1);
    return reducedMotion ? target : withSpring(target, SPRING);
  });

  const boardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(energy.value, [0, 1], [0.97, 1.03]) }],
  }));

  const profile = MOOD_PROFILES[draft];

  const apply = () => {
    // The one commit on this screen earns the heaviest of the three families.
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setMood(draft);
    router.back();
  };

  return (
    // Top edge only. The knob is meant to be cut off by the physical bottom of
    // the screen, and a bottom safe-area inset would float it above one.
    <Screen background={colors.ink} edges={['top']}>
      <BackgroundPattern />

      <View
        style={{
          paddingHorizontal: grid.screenPadding,
          paddingTop: 10,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 20,
        }}
      >
        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.paper,
          }}
        >
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </PressableScale>

        <Text variant="label" color={colors.paperMuted}>
          Now showing
        </Text>

        {/* Balances the back key so the caption sits centred. */}
        <View style={{ width: 44 }} />
      </View>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'space-evenly',
          paddingVertical: 8,
          zIndex: 10,
        }}
      >
        {/* The marquee */}
        <Animated.View style={boardStyle}>
          <View
            style={{
              backgroundColor: colors.blood,
              borderRadius: radius.lg,
              borderWidth: 3,
              borderColor: colors.noir,
              paddingVertical: 12,
              paddingHorizontal: 14,
              gap: 10,
            }}
          >
            <BulbRail energy={energy} />
            <SplitFlap text={MOOD_STOPS[draft]} size={38} />
            <BulbRail energy={energy} />
          </View>
        </Animated.View>

        {/* The real promise of the stop, read from the same profile that builds
            the query — so the line cannot drift from what the dial does. */}
        <View style={{ paddingHorizontal: grid.screenPadding, gap: 4 }}>
          <Text variant="displaySm" color={colors.paper} style={{ textAlign: 'center' }}>
            {profile?.railTitle ?? ''}
          </Text>
          <Text variant="body" color={colors.paperMuted} style={{ textAlign: 'center' }}>
            {profile?.railSubtitle ?? ''}
          </Text>
        </View>

      </View>

      <View
        style={{
          paddingHorizontal: grid.screenPadding,
          paddingBottom: 16,
          alignItems: 'center',
          zIndex: 20,
        }}
      >

        <PressableScale
          onPress={apply}
          scaleTo={0.975}
          accessibilityRole="button"
          accessibilityLabel={`Find something ${MOOD_STOPS[draft].toLowerCase()}`}
          style={{
            alignSelf: 'stretch',
            backgroundColor: colors.paper,
            borderRadius: radius.md,
            borderWidth: 2,
            borderColor: colors.noir,
            paddingVertical: 18,
            alignItems: 'center',
          }}
        >
          <Text variant="label" color={colors.ink} style={{ fontSize: 15, letterSpacing: 2 }}>
            Find something {MOOD_STOPS[draft].toLowerCase()}
          </Text>
        </PressableScale>
      </View>

      {/* The knob, sunk into the bottom edge. Full-bleed and last in the tree so
          it clips against the screen edge rather than against a padded box. */}
      <MoodDial value={draft} onChange={setDraft} stops={MOOD_STOPS} />
    </Screen>
  );
}

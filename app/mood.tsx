import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { MOOD_STOPS, MoodSlider } from '@/components/media/MoodSlider';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { usePrefs } from '@/lib/store/prefs';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

const MEME_PREVIEWS: Record<number, string[]> = {
  0: [ // BAD (Anger, despair, chaos)
    'https://i.imgflip.com/39t1vc.jpg', // Joker hit by car (Joker)
    'https://i.imgflip.com/2req.jpg',   // One does not simply (Lord of the Rings)
    'https://i.imgflip.com/1bg.jpg',    // That escalated quickly (Anchorman)
    'https://i.imgflip.com/1ur9b0.jpg', // Mocking (Spongebob Movie)
  ],
  1: [ // MEH (Confused, condescending, apathy)
    'https://i.imgflip.com/1o12mo.jpg', // Confused Travolta (Pulp Fiction)
    'https://i.imgflip.com/1bid.jpg',   // Condescending Wonka (Willy Wonka)
    'https://i.imgflip.com/196g.jpg',   // See, nobody cares (Jurassic Park)
    'https://i.imgflip.com/34289a.jpg', // Anakin and Padme (Star Wars)
  ],
  2: [ // NORMAL (Realization, neutral, chill)
    'https://i.imgflip.com/1bhm.jpg',   // Morpheus (The Matrix)
    'https://i.imgflip.com/14v4st.jpg', // I am the captain now (Captain Phillips)
    'https://i.imgflip.com/2od.jpg',    // Picard Facepalm (Star Trek Generations)
    'https://i.imgflip.com/26am.jpg',   // Aliens guy (History, but cinematic)
  ],
  3: [ // GOOD (Approval, happy)
    'https://i.imgflip.com/4t0m5.jpg',  // Gatsby Toast (The Great Gatsby)
    'https://i.imgflip.com/2fmt.jpg',   // Leo Laughing (Django Unchained)
    'https://i.imgflip.com/1o12mo.jpg', // Confused Travolta (Pulp Fiction)
    'https://i.imgflip.com/196g.jpg',   // Jurassic Park
  ],
  4: [ // GREAT (Ecstatic, mind blown)
    'https://i.imgflip.com/24y43o.jpg', // Mind blown (Tim & Eric)
    'https://i.imgflip.com/4t0m5.jpg',  // Gatsby Toast (The Great Gatsby)
    'https://i.imgflip.com/2fmt.jpg',   // Django Leo (Django Unchained)
    'https://i.imgflip.com/1bhm.jpg',   // Matrix Morpheus
  ]
};

const BackgroundPattern = () => {
  const line = 'WHAT IS YOUR MOOD NOW? '.repeat(6);
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

const MoodCollage = ({ posters }: { posters: string[] }) => {
  if (!posters?.length) return <View style={{ flex: 1 }} />;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {posters.slice(0, 4).map((path, i) => {
        const isMain = i === 0;
        const rotate = isMain ? '0deg' : i % 2 === 0 ? '14deg' : '-10deg';
        const xOffset = isMain ? 0 : i === 1 ? -70 : i === 2 ? 70 : -30;
        const yOffset = isMain ? 0 : i === 1 ? -90 : i === 2 ? 40 : 110;
        const size = isMain ? 170 : 110;
        const zIndex = isMain ? 10 : 5 - i;

        return (
          <Animated.View
            key={`${path}-${i}`}
            entering={FadeIn.delay(i * 100).duration(400)}
            style={{
              position: isMain ? 'relative' : 'absolute',
              width: size,
              height: size * 1.3,
              transform: [{ translateX: xOffset }, { translateY: yOffset }, { rotate }],
              zIndex,
              backgroundColor: colors.paper,
              padding: 8,
              paddingBottom: 28,
              shadowColor: colors.noir,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.6,
              shadowRadius: 14,
              elevation: 10,
            }}
          >
            <Image
              source={{ uri: path }}
              style={{ flex: 1, backgroundColor: colors.ink }}
              contentFit="cover"
              transition={200}
            />
            {/* Masking tape for scattered photos */}
            {!isMain && (
              <View
                style={{
                  position: 'absolute',
                  top: -12,
                  left: '25%',
                  width: 50,
                  height: 18,
                  backgroundColor: '#E5D5A5',
                  opacity: 0.95,
                  transform: [{ rotate: '-8deg' }],
                  shadowColor: colors.noir,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 2,
                }}
              />
            )}
            {/* Red pushpin for the main photo */}
            {isMain && (
              <View
                style={{
                  position: 'absolute',
                  top: -8,
                  left: '48%',
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: colors.blood,
                  shadowColor: colors.noir,
                  shadowOffset: { width: 1, height: 3 },
                  shadowOpacity: 0.8,
                  shadowRadius: 3,
                  borderWidth: 1,
                  borderColor: withAlpha(colors.paper, 0.5),
                }}
              />
            )}
          </Animated.View>
        );
      })}
    </View>
  );
};

export default function MoodScreen() {
  const router = useRouter();

  const storedMood = usePrefs((state) => state.mood);
  const setMood = usePrefs((state) => state.setMood);

  const [draft, setDraft] = useState<number>(storedMood ?? 2);

  const apply = () => {
    setMood(draft);
    router.back();
  };

  return (
    <Screen background={colors.ink} edges={['top', 'bottom']}>
      <BackgroundPattern />

      {/* Header */}
      <View style={{ paddingHorizontal: grid.screenPadding, paddingTop: 10, gap: 14, zIndex: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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

          <Text variant="label" color={colors.paper} style={{ fontSize: 16 }}>
            What is your mood now?
          </Text>

          <View style={{ width: 44 }} /> {/* Spacer for centering */}
        </View>
      </View>

      {/* Dynamic Collage */}
      <View style={{ flex: 1, marginVertical: 20 }}>
        <MoodCollage posters={MEME_PREVIEWS[draft] ?? []} />
      </View>

      {/* Controls */}
      <View style={{ paddingHorizontal: grid.screenPadding, paddingBottom: 24, gap: 24, zIndex: 20 }}>
        <Animated.View entering={FadeIn.duration(200)}>
          <Display variant="displayXl" color={colors.paper} align="center" textStyle={{ fontSize: 52 }}>
            {MOOD_STOPS[draft]}
          </Display>
        </Animated.View>

        <MoodSlider
          value={draft}
          onChange={setDraft}
          showLabel={false}
          trackColor={colors.blood}
        />

        <PressableScale
          onPress={apply}
          scaleTo={0.975}
          accessibilityRole="button"
          accessibilityLabel={`Look for something ${MOOD_STOPS[draft].toLowerCase()}`}
          style={{
            backgroundColor: colors.blood,
            borderRadius: radius.md,
            paddingVertical: 20,
            alignItems: 'center',
            shadowColor: colors.blood,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.6,
            shadowRadius: 10,
            elevation: 8,
          }}
        >
          <Text variant="label" color={colors.paper} style={{ fontSize: 18, letterSpacing: 2 }}>
            LOOK
          </Text>
        </PressableScale>
      </View>
    </Screen>
  );
}

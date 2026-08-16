import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilmStrip } from '@/components/kino/FilmStrip';
import { TornEdge } from '@/components/kino/TornEdge';
import { VideoRow } from '@/components/media/VideoRow';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useMovieDetails } from '@/lib/queries/movies';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

export interface AboutSheetHandle {
  open: () => void;
  close: () => void;
}

export interface AboutSheetProps {
  movieId?: number;
  /** How much of the sheet is visible when collapsed */
  visibleHeight: number;
}

const SHEET_SPRING = { damping: 24, stiffness: 210, mass: 0.9 } as const;
const CLOSE_TIMING = { duration: 190 } as const;

const BACKDROP_OPACITY = 0.62;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 850;
const TEAR_HEIGHT = 36;
const TEAR_TEETH = 13;
const SHEET_RATIO = 0.78;
const COLLAPSED_LINES = 6;

const RULE = withAlpha(colors.paper, 0.55);
const BODY = withAlpha(colors.paper, 0.93);

export const AboutSheet = forwardRef<AboutSheetHandle, AboutSheetProps>(
  ({ movieId, visibleHeight }, ref) => {
    const router = useRouter();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();

    const { data: movie, isPending } = useMovieDetails(
      typeof movieId === 'number' && Number.isFinite(movieId) ? movieId : undefined
    );

    const sheetHeight = Math.round(height * SHEET_RATIO);

    const [expanded, setExpanded] = useState(false);

    // openness is 0 for closed, 1 for fully open
    const openness = useSharedValue(0);
    const drag = useSharedValue(0);

    useAnimatedReaction(
      () => openness.value > 0.05,
      (isOpen, wasOpen) => {
        if (isOpen !== wasOpen && isOpen !== null) {
          runOnJS(navigation.setOptions)({ tabBarStyle: { display: isOpen ? 'none' : 'flex' } });
        }
      }
    );

    const dismiss = useCallback(() => {
      openness.value = withTiming(0, CLOSE_TIMING);
    }, [openness]);

    useImperativeHandle(ref, () => ({
      open: () => {
        openness.value = withSpring(1, SHEET_SPRING);
      },
      close: dismiss,
    }));

    const sheetStyle = useAnimatedStyle(() => {
      const maxTranslate = sheetHeight - visibleHeight;

      return {
        transform: [
          { translateY: (1 - openness.value) * maxTranslate + drag.value }
        ],
      };
    });

    const isClosed = useDerivedValue(() => openness.value === 0 && drag.value === 0);

    const backdropPointerEvents = useDerivedValue(() => {
      return openness.value > 0.1 || drag.value < -10 ? 'auto' : 'none';
    });

    const backdropStyle = useAnimatedStyle(() => {
      const pulled = openness.value > 0.5 && drag.value > 0 ? drag.value / sheetHeight : 0;
      return {
        opacity: openness.value * (1 - pulled) * BACKDROP_OPACITY,
        pointerEvents: backdropPointerEvents.value,
      };
    });

    const dragHandler = Gesture.Pan()
      .onUpdate((event) => {
        // If open, drag pulls down. If closed, drag pulls up (negative).
        if (openness.value > 0.5) {
          drag.value = event.translationY > 0 ? event.translationY : event.translationY * 0.18;
        } else {
          drag.value = event.translationY < 0 ? event.translationY : event.translationY * 0.18;
        }
      })
      .onEnd((event) => {
        if (openness.value > 0.5) {
          // It was open
          if (event.translationY > DISMISS_DISTANCE || event.velocityY > DISMISS_VELOCITY) {
            openness.value = withTiming(0, CLOSE_TIMING);
            drag.value = 0;
          } else {
            drag.value = withSpring(0, SHEET_SPRING);
          }
        } else {
          // It was closed
          if (event.translationY < -50 || event.velocityY < -DISMISS_VELOCITY) {
            openness.value = withSpring(1, SHEET_SPRING);
            drag.value = 0;
          } else {
            drag.value = withSpring(0, SHEET_SPRING);
          }
        }
      });

    const overview = movie?.overview?.trim();
    const videos = movie?.videos?.results ?? [];

    return (
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'box-none', justifyContent: 'flex-end', zIndex: 50, elevation: 50 }]}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.noir }, backdropStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Close about film"
          />
        </Animated.View>

        <Animated.View
          style={[{
            height: sheetHeight,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
          }, sheetStyle]}
          accessibilityViewIsModal
        >
          <GestureDetector gesture={dragHandler}>
            <View>
              {/* This is the drag handle that is visible even when collapsed */}
              <View style={{ height: TEAR_HEIGHT + 6 }}>
                {/* Shadow layer */}
                <TornEdge
                  variant="flame"
                  fill={colors.inkDeep}
                  height={TEAR_HEIGHT}
                  seed={13}
                  teeth={TEAR_TEETH}
                  jitter={0.6}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
                />
                {/* Main red layer */}
                <TornEdge
                  variant="flame"
                  fill={colors.blood}
                  height={TEAR_HEIGHT}
                  seed={13} // Same seed as shadow so the main shape matches the shadow
                  teeth={TEAR_TEETH}
                  jitter={0.6}
                  style={{ position: 'absolute', top: 6, left: 0, right: 0 }}
                />
              </View>

              <View
                style={{
                  backgroundColor: colors.blood,
                  marginTop: -1,
                  paddingHorizontal: grid.screenPadding,
                  paddingTop: 6,
                  paddingBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                {/* Visual grab handle line */}
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                    top: 10,
                  }}
                >
                  <View
                    style={{
                      width: 46,
                      height: 4,
                      borderRadius: radius.pill,
                      backgroundColor: colors.paper,
                    }}
                  />
                </View>

                <Animated.View
                  style={useAnimatedStyle(() => ({
                    opacity: openness.value, // Hide close button when collapsed
                  }))}
                >
                  <PressableScale
                    onPress={dismiss}
                    scaleTo={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Close about film"
                    hitSlop={10}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent',
                    }}
                  >
                    <Ionicons name="close" size={24} color={colors.inkDeep} />
                  </PressableScale>
                </Animated.View>
              </View>
            </View>
          </GestureDetector>

          <ScrollView
            style={{ flex: 1, backgroundColor: colors.blood }}
            contentContainerStyle={{
              paddingHorizontal: grid.screenPadding,
              paddingTop: 24,
              paddingBottom: insets.bottom + 40,
              alignItems: 'center',
            }}
            showsVerticalScrollIndicator={false}
          >
            <Display
              variant="displayXl"
              color={colors.paper}
              shadowColor={colors.inkDeep}
              offset={{ x: 3, y: 4 }}
              align="center"
              textStyle={{ fontSize: 92, lineHeight: 94 }}
            >
              ABOUT FILM
            </Display>

            <View style={{ position: 'relative' }}>
              <Text
                variant="body"
                color={BODY}
                numberOfLines={expanded ? undefined : COLLAPSED_LINES}
                style={{ marginTop: 24, lineHeight: 22, textAlign: 'center', paddingHorizontal: 10 }}
              >
                {overview || (isPending ? 'Loading…' : 'No synopsis on file for this one.')}
              </Text>

              {!expanded && overview ? (
                <LinearGradient
                  colors={['transparent', colors.blood]}
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 100,
                  }}
                  pointerEvents="none"
                />
              ) : null}
            </View>

            {overview ? (
              <PressableScale
                onPress={() => setExpanded((value) => !value)}
                scaleTo={0.96}
                accessibilityRole="button"
                accessibilityLabel={expanded ? 'Show less' : 'Show the full synopsis'}
                style={{
                  backgroundColor: colors.inkDeep,
                  borderRadius: radius.pill,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  marginTop: 24,
                }}
              >
                <Text variant="label" color={colors.paper}>
                  {expanded ? 'See Less' : 'See More'}
                </Text>
              </PressableScale>
            ) : null}

            {videos.length ? (
              <View style={{ marginTop: 40, alignSelf: 'stretch' }}>
                <FilmStrip height={16} pitch={20} stripColor={colors.inkDeep} />
                <Display
                  variant="display"
                  color={colors.paper}
                  shadowColor={colors.inkDeep}
                  align="center"
                  textStyle={{ fontSize: 96, lineHeight: 98 }}
                  style={{ marginTop: 18 }}
                >
                  CLIPS
                </Display>
                <View style={{ marginTop: 10 }}>
                  <VideoRow videos={videos} />
                </View>
              </View>
            ) : null}

            <PressableScale
              onPress={() => {
                if (movieId) {
                  router.push({
                    pathname: '/movies/[id]',
                    params: { id: String(movieId) },
                  });
                }
              }}
              scaleTo={0.97}
              accessibilityRole="link"
              accessibilityLabel={`Open the full record for ${movie?.title ?? 'this film'}`}
              style={{
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 7,
                borderRadius: radius.pill,
                borderWidth: 2,
                borderColor: colors.inkDeep,
                paddingHorizontal: 18,
                paddingVertical: 9,
                marginTop: 40,
              }}
            >
              <Text variant="label" color={colors.inkDeep}>
                Full record
              </Text>
              <Ionicons name="arrow-forward" size={13} color={colors.inkDeep} />
            </PressableScale>
          </ScrollView>
        </Animated.View>
      </View>
    );
  }
);

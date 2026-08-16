import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { colors, radius, tabBar } from '@/theme/tokens';

/**
 * The bar's three destinations, in bar order. Listing them explicitly rather
 * than mapping `state.routes` is deliberate: `profile` is a route in this group
 * reached by pushing from the Selection header, and iterating the navigator
 * state would put it in the bar.
 *
 * `name` is the route file; `label` is only ever the display string. The two
 * are intentionally allowed to diverge — renaming a tab must never mean
 * renaming a file and rewriting every `router.push` that targets it.
 */
const TABS = [
  { name: 'index', label: 'Home', icon: 'grid' },
  { name: 'filmder', label: 'Flicks', icon: 'albums' },
  { name: 'bookmark', label: 'Vault', icon: 'star' },
] as const;

/**
 * Derived from the public `Tabs` export rather than imported from
 * `@react-navigation/bottom-tabs`. Expo Router vendors its own copy of those
 * types, and the two are structurally incompatible.
 */
type TabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>['tabBar']>
>[0];

/**
 * Read from the token, not declared here. The bar's height is computed FROM
 * these, so a local copy that drifts is a pill taller than the bar containing
 * it — which renders as icons spilling over the bar's top edge and clipping.
 */
const ICON_SIZE = tabBar.icon;
const PILL_PAD_V = tabBar.pillPaddingV;
const PILL_BORDER = tabBar.pillBorder;

/** Gap between the icon and the label once the pill is open. */
const LABEL_GAP = 8;
/**
 * Shared by the visible label and the hidden copy that measures it. They must
 * be the same object: any divergence and the pill animates to the wrong width.
 */
const LABEL_STYLE = { fontSize: 16 } as const;

/**
 * The pill's end states, as opaque colours from the palette.
 *
 * "Clear" is the bar's own ground rather than a transparent blood or the
 * `'transparent'` keyword: the palette is solid-only, and `interpolateColor`
 * cannot parse the keyword anyway — the fill would snap instead of fade. An
 * inactive pill painted in the surface it sits on is indistinguishable from no
 * pill at all, and it gives the interpolation two real colours to cross. The
 * hairline outline is faded in the same way, off the same value.
 */
const PILL_CLEAR = colors.inkDeep;
const PILL_FILL = colors.blood;

/**
 * Underdamped on purpose (zeta ~0.84): the pill settles with a barely-there
 * overshoot, which is what separates "grows" from "snaps". The overshoot is
 * spent on the horizontal padding and the icon scale — the label *width* is
 * clamped to [0, 1] below, because overshooting that just parks empty space
 * inside the pill for a frame.
 */
const SPRING = { damping: 20, stiffness: 220, mass: 0.65 } as const;
const PRESS_SPRING = { damping: 18, stiffness: 340, mass: 0.5 } as const;

/**
 * One destination. Collapsed it is a bare outline icon; focused it grows into a
 * blood pill with a hairline ivory outline, carrying its name.
 *
 * Three things happen together, all driven by the same `progress` value so they
 * can never drift out of step:
 *
 * 1. The pill fills, from the bar's ground to blood.
 * 2. Its outline fades up from that same ground to ivory.
 * 3. The label reveals from zero width behind `overflow: hidden`.
 *
 * The glyph itself does NOT change cut. Every icon stays on its outline
 * variant in ivory whether focused or not — selection is carried entirely by
 * the pill, which is what the design does. An earlier version cross-faded
 * outline-to-solid; against a palette where the dim ivory and the bright one
 * are the same colour, that swap only made the active icon heavier than its
 * neighbours for no reason.
 *
 * The label width is measured, not guessed: a hidden copy sizes itself to the
 * text (absolutely positioned, so it contributes nothing to layout) and the
 * visible copy animates to that number. The alternative, a Reanimated layout
 * transition, hands the timing to the layout engine and is markedly less
 * predictable on Android.
 */
function TabButton({
  focused,
  label,
  icon,
  onPress,
}: {
  focused: boolean;
  label: string;
  icon: (typeof TABS)[number]['icon'];
  onPress: () => void;
}) {
  const [labelWidth, setLabelWidth] = useState(0);
  const pressed = useSharedValue(0);

  // useDerivedValue rather than an effect: `focused` is a plain prop, so no
  // SharedValue lands in a dependency array (which the React Compiler's
  // immutability rule rejects).
  const progress = useDerivedValue(() => withSpring(focused ? 1 : 0, SPRING));

  // Driven from a shared value rather than Pressable's `pressed` render-prop:
  // that callback re-renders the button on every touch, and a re-render in the
  // middle of a spring is exactly when Android drops the frame.
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.07 }],
  }));

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [PILL_CLEAR, PILL_FILL]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [PILL_CLEAR, colors.paper]
    ),
    paddingHorizontal: 13 + progress.value * 5,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.94 + progress.value * 0.06 }],
  }));

  const labelStyle = useAnimatedStyle(() => {
    // Clamped: the spring dips below 0 on the way out and past 1 on the way in,
    // and a negative width is a hard native error on Android.
    const open = Math.min(1, Math.max(0, progress.value));
    return {
      width: open * labelWidth,
      marginLeft: open * LABEL_GAP,
      // Held back until the pill is most of the way open, so the text arrives
      // into space that already exists instead of squeezing into it.
      opacity: interpolate(open, [0.5, 1], [0, 1], Extrapolation.CLAMP),
    };
  });

  return (
    <Pressable
      onPress={onPress}
      // Inline, not `useCallback`: a SharedValue in a dependency array trips the
      // React Compiler's immutability rule the moment the body writes to it.
      onPressIn={() => {
        pressed.value = withSpring(1, PRESS_SPRING);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, PRESS_SPRING);
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      hitSlop={10}
    >
      <Animated.View style={containerStyle}>
        <Animated.View
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: radius.pill,
              borderWidth: PILL_BORDER,
              paddingVertical: PILL_PAD_V,
              // No minHeight. The icon plus this padding IS the height, and it
              // is the same sum the bar sizes itself from — a floor here could
              // only push the pill past its container again.
            },
            pillStyle,
          ]}
        >
          <Animated.View style={iconStyle}>
            <Ionicons name={`${icon}-outline`} size={ICON_SIZE} color={colors.paper} />
          </Animated.View>

          <Animated.View style={[{ overflow: 'hidden' }, labelStyle]}>
            <Text
              variant="heading"
              color={colors.paper}
              numberOfLines={1}
              style={LABEL_STYLE}
            >
              {label}
            </Text>
          </Animated.View>

          {/* Measured only. Absolute, so it never affects the row. */}
          <Text
            variant="heading"
            numberOfLines={1}
            onLayout={(e) => setLabelWidth(e.nativeEvent.layout.width)}
            style={[LABEL_STYLE, { position: 'absolute', opacity: 0 }]}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {label}
          </Text>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/**
 * Replaces React Navigation's bar wholesale. The stock one owns the row layout
 * and composes its own `paddingBottom: insets.bottom` underneath any style you
 * give it, which silently eats the content height of a fixed-height bar.
 *
 * Anchored, not floating: full-bleed to both edges, flush with the bottom of
 * the screen, and rounded only on the two top corners — so the red ground of
 * the screen reads as sitting *on* a black shelf rather than behind a pill.
 *
 * The safe-area inset is PADDING, not an offset. Adding it to `bottom` would
 * float the bar above a home indicator and expose the screen underneath; adding
 * it to the height and padding it out keeps the black running all the way to
 * the physical edge with the buttons pushed clear of the indicator.
 */
function KinoTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const currentRoute = state.routes[state.index];
  const { options } = descriptors[currentRoute.key];
  const isHidden = options.tabBarStyle?.display === 'none';

  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withTiming(isHidden ? tabBar.height + insets.bottom + 20 : 0, {
      duration: 250,
    });
  }, [isHidden, insets.bottom]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: tabBar.height,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-evenly',
          paddingHorizontal: 34,
          borderTopLeftRadius: tabBar.radius,
          borderTopRightRadius: tabBar.radius,
          backgroundColor: colors.inkDeep,
          elevation: 18,
          shadowColor: colors.noir,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
        },
        animatedStyle,
      ]}
    >
      {TABS.map((tab) => {
        const index = state.routes.findIndex((r) => r.name === tab.name);
        if (index === -1) return null;

        const route = state.routes[index];
        const focused = state.index === index;

        return (
          <TabButton
            key={route.key}
            focused={focused}
            label={tab.label}
            icon={tab.icon}
            onPress={() => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (focused || event.defaultPrevented) return;

              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                () => { }
              );
              navigation.navigate(route.name, route.params);
            }}
          />
        );
      })}
    </Animated.View>
  );
}

export default function Layout() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.ink,
        }}
      >
        <ActivityIndicator size="large" color={colors.blood} />
      </View>
    );
  }

  // Defensive only. The onboarding branch belongs to app/index.tsx alone —
  // duplicating it here is how expo-router redirect loops start.
  if (!isSignedIn) return <Redirect href="/sign-in" />;

  return (
    <Tabs
      // Home, not the deck. The deck is the app's differentiator, but landing
      // straight on a single card gives a returning user nothing to orient
      // against and hides the one screen that reports what the app has learned
      // about them. Flicks is one tap away and keeps its own scroll position.
      initialRouteName="index"
      tabBar={(props) => <KinoTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="filmder" options={{ title: 'Flicks' }} />
      <Tabs.Screen name="bookmark" options={{ title: 'Vault' }} />

      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

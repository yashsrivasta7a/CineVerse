import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import type { PrefFacet, PrefStance } from '@/db/queries/prefs';
import { posterUrl, profileUrl } from '@/lib/api/tmdb/images';
import { usePrefs } from '@/lib/store/prefs';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

export interface PreferenceItem {
  value: string;
  label: string;
  imagePath?: string | null;
  /** Leading glyph for chip items — a flag, for countries. */
  glyph?: string;
}

export type PreferenceVariant = 'chip' | 'tile' | 'avatar';

export interface PreferenceStepProps {
  title: string;
  subtitle: string;
  facet: PrefFacet;
  stance: PrefStance;
  items: PreferenceItem[];
  loading?: boolean;
  variant?: PreferenceVariant;
  query?: string;
  onQueryChange?: (text: string) => void;
  searchPlaceholder?: string;
  /** Where FORWARD and SKIP both go. */
  onNext: () => void;
  canGoBack?: boolean;
}

const GAP = 10;
const ROWS: Record<PreferenceVariant, number> = { chip: 7, tile: 2, avatar: 2 };
const CHIP_HEIGHT = 42;
/**
 * How far the artwork of an unselected item is knocked back. Not lower than
 * this: on first open NOTHING is selected, so this value is what the entire
 * screen looks like at rest. Too aggressive and the grid reads as disabled.
 */
const UNSELECTED_ART_OPACITY = 0.55;
/** Entrance stagger, capped so a long list doesn't crawl in for two seconds. */
const stagger = (index: number) => Math.min(index, 9) * 28;

/** Red disc with a cross — the selection marker from the masterplan. */
const RemoveBadge = ({ size = 36 }: { size?: number }) => (
  <Animated.View
    entering={ZoomIn.duration(200)}
    pointerEvents="none"
    style={{
      position: 'absolute',
      top: -size / 3.5,
      right: -size / 3.5,
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colors.paper,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: colors.blood,
      zIndex: 3,
    }}
  >
    <Ionicons name="close" size={size * 0.7} color={colors.blood} />
  </Animated.View>
);

interface CellProps {
  item: PreferenceItem;
  facet: PrefFacet;
  stance: PrefStance;
  variant: PreferenceVariant;
  size: number;
  index: number;
  onToggle: (item: PreferenceItem, selected: boolean) => void;
}

/**
 * A single selectable cell.
 *
 * Separate and memoized for one specific reason: it subscribes to *its own*
 * selection state as a boolean rather than reading the whole `entries` map.
 * Toggling replaces that map, so anything reading it re-renders every mounted
 * cell on every tap — with ~90 countries, and earlier steps still mounted in
 * the stack, that is hundreds of re-renders per press. A primitive selector
 * means only the cell that actually changed re-renders.
 */
const PreferenceCell = memo(function PreferenceCell({
  item,
  facet,
  stance,
  variant,
  size,
  index,
  onToggle,
}: CellProps) {
  const selected = usePrefs(
    (state) => state.entries[`${facet}:${item.value}`]?.stance === stance
  );

  const common = {
    onPress: () => onToggle(item, selected),
    accessibilityRole: 'button' as const,
    accessibilityLabel: item.label,
    accessibilityState: { selected },
  };

  if (variant === 'chip') {
    return (
      <Animated.View entering={FadeInDown.delay(stagger(index)).duration(320)}>
        <PressableScale
          {...common}
          scaleTo={1}
          style={{
            height: CHIP_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.paper,
            borderRadius: radius.pill,
            paddingHorizontal: 15,
            opacity: selected ? 1 : 0.9,
          }}
        >
          {item.glyph ? (
            <Text variant="heading" color={colors.ink} style={{ fontSize: 17 }}>
              {item.glyph}
            </Text>
          ) : null}
          <Text variant="heading" color={colors.ink} numberOfLines={1} style={{ fontSize: 15 }}>
            {item.label}
          </Text>
          {selected ? <RemoveBadge size={22} /> : null}
        </PressableScale>
      </Animated.View>
    );
  }

  const isAvatar = variant === 'avatar';
  const uri = isAvatar ? profileUrl(item.imagePath, 'w185') : posterUrl(item.imagePath, 'w342');
  const cornerRadius = isAvatar ? size / 2 : radius.md;

  return (
    <Animated.View entering={FadeInDown.delay(stagger(index)).duration(320)}>
      <PressableScale {...common} style={{ width: size, height: size }}>
        <View
          style={{
            flex: 1,
            borderRadius: cornerRadius,
            overflow: 'hidden',
            borderWidth: selected ? 4.5 : 2.5,
            borderColor: selected ? colors.paper : withAlpha(colors.noir, 0.28),
            // A dark base, not a dark RED one: a cell whose artwork failed to
            // load must still read as a cell against the red ground rather than
            // vanishing into it.
            backgroundColor: colors.inkRaised,
          }}
        >
          {/* Only the ARTWORK dims. The gradient and label sit above this layer,
              so text stays legible at rest — dimming those too dropped actor
              names below an accessible contrast ratio, and made the whole grid
              look disabled before anything had been picked. */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { opacity: selected ? 1 : UNSELECTED_ART_OPACITY },
            ]}
          >
            {uri ? (
              <Image
                source={{ uri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons
                  name={isAvatar ? 'person' : 'film-outline'}
                  size={size * 0.3}
                  color={withAlpha(colors.paper, 0.5)}
                />
              </View>
            )}
          </View>

          <LinearGradient
            colors={['transparent', withAlpha(colors.noir, isAvatar ? 0.94 : 0.92)]}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: isAvatar ? '62%' : '58%',
            }}
          />

          <Text
            variant="heading"
            color={colors.paper}
            numberOfLines={isAvatar ? 2 : 1}
            style={
              isAvatar
                ? {
                  position: 'absolute',
                  left: 5,
                  right: 5,
                  bottom: 9,
                  textAlign: 'center',
                  fontSize: 11.5,
                  lineHeight: 14,
                }
                : {
                  position: 'absolute',
                  left: 5,
                  right: 5,
                  bottom: 8,
                  textAlign: 'center',
                  fontSize: 26
                }
            }
          >
            {item.label}
          </Text>
        </View>
        {selected ? <RemoveBadge size={isAvatar ? 22 : 34} /> : null}
      </PressableScale>
    </Animated.View>
  );
});

/**
 * One step of onboarding.
 *
 * Every step is the same screen with different data, so the flow is one
 * component and six thin routes rather than six near-identical screens.
 *
 * Layout: rows are chunked explicitly in JS and rendered inside a horizontal
 * ScrollView. An earlier version leaned on `flexDirection: 'column'` +
 * `flexWrap: 'wrap'` with a bounded height to get column-major flow. That is
 * fragile twice over — the height has to absorb inter-row gaps exactly, and
 * Yoga's default `alignItems: 'stretch'` blows variable-width pills out to the
 * width of the longest label in their column. Explicit chunking has neither
 * problem, and it reproduces the design's staggered chip rows, which aligned
 * columns cannot.
 *
 * SKIP and FORWARD deliberately go to the same place: skipping leaves a facet
 * empty, which is a valid preference set. Nothing here is required.
 */
export function PreferenceStep({
  title,
  subtitle,
  facet,
  stance,
  items,
  loading = false,
  variant = 'chip',
  query,
  onQueryChange,
  searchPlaceholder = 'Search',
  onNext,
  canGoBack = true,
}: PreferenceStepProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const toggleStance = usePrefs((state) => state.toggleStance);

  // A primitive, so this screen re-renders only when the count actually moves —
  // and the memoized cells skip entirely when it does.
  const selectedCount = usePrefs((state) => {
    let count = 0;
    for (const item of items) {
      if (state.entries[`${facet}:${item.value}`]?.stance === stance) count += 1;
    }
    return count;
  });

  const available = width - grid.screenPadding * 2;
  // Sized so the next item is partly visible — that peek is what tells the user
  // the row scrolls sideways.
  const tileSize = Math.round(available * 0.46);
  const avatarSize = Math.round(available * 0.3);
  const cellSize = variant === 'tile' ? tileSize : avatarSize;

  const rowCount = ROWS[variant];

  // Round-robin, so the flow reads down-then-across like the design's columns.
  const rows = useMemo(() => {
    const out: PreferenceItem[][] = Array.from({ length: rowCount }, () => []);
    items.forEach((item, index) => out[index % rowCount].push(item));
    return out;
  }, [items, rowCount]);

  const handleToggle = useCallback(
    (item: PreferenceItem, selected: boolean) => {
      Haptics.impactAsync(
        selected ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium
      );
      toggleStance(facet, item.value, stance, item.label, item.imagePath);
    },
    [facet, stance, toggleStance]
  );

  const isEmptyState = loading || items.length === 0;

  return (
    <Screen background={colors.blood} edges={['top', 'bottom']}>
      <View style={{ paddingHorizontal: grid.screenPadding, gap: 16, paddingTop: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {canGoBack ? (
            <PressableScale
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={{
                width: 42,
                height: 42,
                borderRadius: radius.md,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.paper,
              }}
            >
              <Ionicons name="arrow-back" size={20} color={colors.ink} />
            </PressableScale>
          ) : (
            <View style={{ width: 42, height: 42 }} />
          )}
        </View>

        <View style={{ alignItems: 'center', gap: 10 }}>
          <Display
            variant="display"
            color={colors.paper}
            shadowColor={withAlpha(colors.noir, 0.38)}
            offset={{ x: 2, y: 3 }}
            textStyle={{ fontSize: 120, lineHeight: 110 }}
            align="center"
          >
            {title}
          </Display>

          <Text
            variant="heading"
            color={colors.paper}
            style={{ textAlign: 'center', paddingHorizontal: 28, fontSize: 16, lineHeight: 21 }}
          >
            {subtitle}
          </Text>
        </View>

        {onQueryChange ? (
          <SearchField
            variant="pill"
            placeholder={searchPlaceholder}
            value={query}
            onChangeText={onQueryChange}
          />
        ) : null}
      </View>

      {/*
        The grid sits at the TOP of this band, as in the design — the open red
        space belongs below it. Centring applies only to the loading and empty
        states. (A ScrollView carries its own flexGrow: 1, so `justifyContent`
        here would have been a no-op for the grid regardless.)
      */}
      <View style={{ flex: 1, justifyContent: isEmptyState ? 'center' : 'flex-start' }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.paper} />
        ) : items.length === 0 ? (
          <Text
            variant="body"
            color={withAlpha(colors.paper, 0.85)}
            style={{ textAlign: 'center' }}
          >
            Nothing matches that search.
          </Text>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            style={{ flexGrow: 0 }}
            // Vertical padding leaves room for the badges, which overhang the
            // top-right corner of each cell.
            contentContainerStyle={{
              paddingHorizontal: grid.screenPadding,
              paddingVertical: 12,
            }}
          >
            <View style={{ gap: GAP }}>
              {rows.map((row, rowIndex) => (
                <View
                  key={rowIndex}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: GAP }}
                >
                  {row.map((item, columnIndex) => (
                    <PreferenceCell
                      key={item.value}
                      item={item}
                      facet={facet}
                      stance={stance}
                      variant={variant}
                      size={cellSize}
                      index={columnIndex * rowCount + rowIndex}
                      onToggle={handleToggle}
                    />
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      <View style={{ paddingHorizontal: grid.screenPadding, paddingBottom: 12, gap: 11 }}>
        <PressableScale
          onPress={onNext}
          scaleTo={0.975}
          accessibilityRole="button"
          accessibilityLabel="Forward"
          style={{
            backgroundColor: colors.inkDeep,
            borderRadius: radius.md,
            paddingVertical: 18,
            alignItems: 'center',
          }}
        >
          <Text variant="label" color={colors.paper} style={{ fontSize: 17, letterSpacing: 1.8 }}>
            Forward{selectedCount > 0 ? `  ·  ${selectedCount}` : ''}
          </Text>
        </PressableScale>

        <PressableScale
          onPress={onNext}
          scaleTo={0.975}
          accessibilityRole="button"
          accessibilityLabel="Skip this step"
          style={{
            borderRadius: radius.md,
            borderWidth: 1.5,
            borderColor: withAlpha(colors.paper, 0.55),
            paddingVertical: 16,
            alignItems: 'center',
          }}
        >
          <Text variant="label" color={colors.ink} style={{ fontSize: 17, letterSpacing: 1.8 }}>
            Skip
          </Text>
        </PressableScale>
      </View>
    </Screen>
  );
}

export default PreferenceStep;

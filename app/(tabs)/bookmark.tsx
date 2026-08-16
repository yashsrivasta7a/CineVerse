import React, { useCallback, useMemo } from 'react'
import { ActivityIndicator, Alert, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { Screen } from '@/components/ui/Screen'
import { Text } from '@/components/ui/Text'
import { Display } from '@/components/ui/Display'
import { PressableScale } from '@/components/ui/PressableScale'
import { TicketCard } from '@/components/kino/TicketCard'
import { Barcode } from '@/components/kino/Barcode'
import { PosterCard } from '@/components/media/PosterCard'

import { useBookmarkedMovies } from '@/lib/queries/bookmarks'
import { useGridWidth } from '@/lib/hooks/useGridWidth'
import { normalizeMovieDetails } from '@/lib/api/tmdb/normalize'
import { colors, grid, radius, withAlpha } from '@/theme/tokens'

interface SectionHeadingProps {
    label: string
    count?: number
    onClear?: () => void
    style?: StyleProp<ViewStyle>
}

/** A divider between the Vault's two halves, with the bulk one clearable. */
const SectionHeading = ({ label, count, onClear, style }: SectionHeadingProps) => (
    <View
        style={[
            {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: grid.screenPadding,
                marginBottom: 14,
            },
            style,
        ]}
    >
        <Text variant="label" color={withAlpha(colors.paper, 0.65)}>
            {label}
            {count !== undefined ? `  ·  ${count}` : ''}
        </Text>

        {onClear ? (
            <PressableScale
                onPress={() =>
                    Alert.alert(
                        'Clear these?',
                        `${count} film${count === 1 ? '' : 's'} saved from Flicks will be removed. Films you kept by hand stay.`,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Clear', style: 'destructive', onPress: onClear },
                        ]
                    )
                }
                scaleTo={0.95}
                accessibilityRole="button"
                accessibilityLabel="Clear every film saved from Flicks"
                style={{
                    paddingHorizontal: 12,
                    paddingVertical: 5,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: withAlpha(colors.paper, 0.3),
                }}
            >
                <Text variant="label" color={withAlpha(colors.paper, 0.65)} style={{ fontSize: 11 }}>
                    Clear
                </Text>
            </PressableScale>
        ) : null}
    </View>
)

const Bookmark = () => {
    const { user } = useUser();

    // Each title is its own cache entry, so one failing lookup no longer blanks
    // the whole watchlist, and opening a saved film is instant.
    const { movies, flicksIds, clearFromFlicks, isPending, refetch, failedCount, syncError } =
        useBookmarkedMovies(user?.id);
    const { itemWidth, gutter } = useGridWidth(2);

    // Unconditional: the list is read from SQLite, so it refreshes on focus
    // whether or not there is a signed-in user or a reachable backend.
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [refetch])
    );

    const titles = useMemo(() => movies.map(normalizeMovieDetails), [movies]);

    /**
     * Split by provenance.
     *
     * A right-swipe on Flicks saves automatically, and at any real swipe rate
     * that buries a hand-curated Vault under deck output within a session. The
     * two are kept apart so the deliberate saves stay findable — and so the
     * bulk half can be emptied in one action without touching them.
     */
    const { kept, fromFlicks } = useMemo(() => {
        const kept: typeof titles = [];
        const fromFlicks: typeof titles = [];
        for (const title of titles) {
            (flicksIds.has(title.id) ? fromFlicks : kept).push(title);
        }
        return { kept, fromFlicks };
    }, [titles, flicksIds]);

    const grid2 = {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: gutter,
        rowGap: 24,
        paddingHorizontal: grid.screenPadding,
    };

    return (
        <Screen osd={{ left: 'THE VAULT', right: 'SAVED&KEPT' }}>
            <View style={{ paddingHorizontal: grid.screenPadding, paddingTop: 6 }}>
                <Display variant="display">My vault</Display>
                <Text
                    variant="script"
                    color={colors.blood}
                    style={{ marginTop: -2, marginLeft: 4, transform: [{ rotate: '-3deg' }] }}
                >
                    kept for later
                </Text>
            </View>

            {isPending ? (
                <ActivityIndicator size="large" color={colors.blood} style={{ marginTop: 60 }} />
            ) : titles.length === 0 ? (
                <View style={{ paddingHorizontal: grid.screenPadding, marginTop: 34 }}>
                    <TicketCard pageBackground={colors.ink}>
                        <View style={{ padding: 22, alignItems: 'center', gap: 10 }}>
                            <Ionicons name="bookmark-outline" size={40} color={colors.blood} />
                            <Text variant="displaySm" color={colors.ink} style={{ textAlign: 'center' }}>
                                Vault is empty
                            </Text>
                            <Text
                                variant="bodySm"
                                color={withAlpha(colors.ink, 0.7)}
                                style={{ textAlign: 'center' }}
                            >
                                Films you save get filed here, ready when you are.
                            </Text>
                        </View>
                        <View style={{ alignItems: 'center', paddingBottom: 18, paddingTop: 26 }}>
                            <Barcode value="empty-vault" height={22} />
                        </View>
                    </TicketCard>
                </View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingTop: 22, paddingBottom: 130 }}
                >
                    {syncError ? (
                        <Text
                            variant="bodySm"
                            color={withAlpha(colors.paper, 0.6)}
                            style={{ paddingHorizontal: grid.screenPadding, marginBottom: 14 }}
                        >
                            Showing your saved list from this device — it couldn&apos;t
                            sync just now.
                        </Text>
                    ) : null}

                    {failedCount > 0 ? (
                        <Text
                            variant="bodySm"
                            color={withAlpha(colors.paper, 0.6)}
                            style={{ paddingHorizontal: grid.screenPadding, marginBottom: 14 }}
                        >
                            {failedCount} saved {failedCount > 1 ? 'films' : 'film'} couldn&apos;t be loaded.
                        </Text>
                    ) : null}

                    {/* Only headed once there is a second section to tell it
                        apart from — a lone heading over the only list on screen
                        is noise. */}
                    {kept.length > 0 && fromFlicks.length > 0 ? (
                        <SectionHeading label="Kept by hand" />
                    ) : null}

                    {kept.length > 0 ? (
                        <View style={grid2}>
                            {kept.map((title) => (
                                <PosterCard key={title.id} title={title} style={{ width: itemWidth }} />
                            ))}
                        </View>
                    ) : null}

                    {fromFlicks.length > 0 ? (
                        <>
                            <SectionHeading
                                label="From Flicks"
                                count={fromFlicks.length}
                                onClear={clearFromFlicks}
                                style={{ marginTop: kept.length > 0 ? 34 : 0 }}
                            />
                            <View style={grid2}>
                                {fromFlicks.map((title) => (
                                    <PosterCard key={title.id} title={title} style={{ width: itemWidth }} />
                                ))}
                            </View>
                        </>
                    ) : null}
                </ScrollView>
            )}
        </Screen>
    )
}

export default Bookmark

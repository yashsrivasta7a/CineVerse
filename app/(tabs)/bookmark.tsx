import React, { useCallback, useMemo } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { Screen } from '@/components/ui/Screen'
import { Text } from '@/components/ui/Text'
import { Display } from '@/components/ui/Display'
import { TicketCard } from '@/components/kino/TicketCard'
import { Barcode } from '@/components/kino/Barcode'
import { PosterCard } from '@/components/media/PosterCard'

import { useBookmarkedMovies } from '@/lib/queries/bookmarks'
import { useGridWidth } from '@/lib/hooks/useGridWidth'
import { normalizeMovieDetails } from '@/lib/api/tmdb/normalize'
import { colors, grid, withAlpha } from '@/theme/tokens'

const Bookmark = () => {
    const { user } = useUser();

    // Each title is its own cache entry, so one failing lookup no longer blanks
    // the whole watchlist, and opening a saved film is instant.
    const { movies, isPending, refetch, failedCount, syncError } =
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

                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: gutter,
                            rowGap: 24,
                            paddingHorizontal: grid.screenPadding,
                        }}
                    >
                        {titles.map((title) => (
                            <PosterCard key={title.id} title={title} style={{ width: itemWidth }} />
                        ))}
                    </View>
                </ScrollView>
            )}
        </Screen>
    )
}

export default Bookmark

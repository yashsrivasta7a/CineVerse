import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import {
    ActivityIndicator,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Barcode } from '@/components/decor/Barcode'
import { DashedCard } from '@/components/decor/DashedCard'
import { FilmStrip } from '@/components/decor/FilmStrip'
import { RatingStars } from '@/components/decor/RatingStars'
import { TicketCard } from '@/components/decor/TicketCard'
import { TornEdge } from '@/components/decor/TornEdge'
import { TornSection } from '@/components/decor/TornSection'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Display } from '@/components/ui/Display'
import { Text } from '@/components/ui/Text'

import { CastRow } from '@/components/media/CastRow'
import { ProviderRow } from '@/components/media/ProviderRow'
import { ReviewCard } from '@/components/media/ReviewCard'
import { SectionBlock } from '@/components/media/SectionBlock'
import { VideoRow } from '@/components/media/VideoRow'
import { backdropUrlOrPlaceholder, logoUrl } from '@/lib/api/tmdb/images'
import {
    DEFAULT_WATCH_REGION,
    resolveProviders,
} from '@/lib/api/tmdb/providers'
import { useBookmarkToggle } from '@/lib/queries/bookmarks'
import { useMovieDetails } from '@/lib/queries/movies'
import { colors, grid, radius, withAlpha } from '@/theme/tokens'

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value)

const runtimeLabel = (minutes: number | null) =>
    minutes ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : null

const RoundButton = ({
    icon,
    onPress,
    label,
    tone = 'ink',
}: {
    icon: any
    onPress: () => void
    label: string
    tone?: 'ink' | 'paper'
}) => (
    <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => ({
            width: 42,
            height: 42,
            borderRadius: radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tone === 'paper' ? colors.paper : colors.inkRaised,
            borderWidth: 2,
            borderColor: colors.noir,
            transform: [{ translateY: pressed ? 2 : 0 }],
        })}
    >
        <Ionicons
            name={icon}
            size={19}
            color={tone === 'paper' ? colors.ink : colors.paper}
        />
    </Pressable>
)

const DetailCell = ({ label, value }: { label: string; value: string }) => (
    <View style={{ width: '48%', gap: 2 }}>
        <Text variant="osd" color={withAlpha(colors.ink, 0.5)}>{label}</Text>
        <Text variant="heading" color={colors.ink} numberOfLines={2}>{value}</Text>
    </View>
)

const MovieDetails = () => {
    const { id } = useLocalSearchParams()
    const router = useRouter()
    const insets = useSafeAreaInsets()

    const { data: movie, isPending, error } = useMovieDetails(id as string)

    // Providers now ride along inside the detail request's append_to_response,
    // so there is no second API, no second key and no separate quota.
    const providers = useMemo(
        () => resolveProviders(movie?.['watch/providers'], DEFAULT_WATCH_REGION),
        [movie]
    )

    const [aboutExpanded, setAboutExpanded] = useState(false)

    // Local-first: the star flips on a synchronous SQLite write and the change
    // reaches Appwrite on the next sync. It no longer waits on — or is lost
    // to — an unreachable backend.
    const { isBookmarked, toggle: updateBookmarks } = useBookmarkToggle(
        'movie',
        movie?.id,
        movie?.title
    )

    if (isPending) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={colors.blood} />
            </View>
        )
    }

    if (error || !movie) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: colors.ink,
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: grid.screenPadding,
                    gap: 18,
                }}
            >
                <Display variant="displaySm">Reel not found</Display>
                <Button label="Go back" onPress={() => router.back()} full={false} />
            </View>
        )
    }

    const year = movie.release_date ? movie.release_date.slice(0, 4) : null
    const runtime = runtimeLabel(movie.runtime)
    const country = movie.production_countries?.[0]?.iso_3166_1

    return (
        <View style={{ flex: 1, backgroundColor: colors.ink }}>
            <StatusBar hidden />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* Cinematic Header Image */}
                <View style={{ position: 'relative', width: '100%', height: 480 }}>
                    <Image
                        source={{
                            uri: backdropUrlOrPlaceholder(
                                movie.backdrop_path ?? movie.poster_path,
                                'original'
                            ),
                        }}
                        style={{ width: '100%', height: '100%', opacity: 0.85 }}
                        contentFit="cover"
                        transition={220}
                        cachePolicy="memory-disk"
                    />
                    <LinearGradient
                        colors={['transparent', colors.ink]}
                        locations={[0.4, 1]}
                        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300 }}
                    />
                </View>

                {/* Top chrome */}
                <View
                    style={{
                        position: 'absolute',
                        top: Platform.OS === 'ios' ? insets.top : insets.top + 8,
                        left: grid.screenPadding,
                        right: grid.screenPadding,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        zIndex: 10,
                    }}
                >
                    <RoundButton icon="arrow-back" label="Go back" onPress={() => router.back()} />
                    <RoundButton
                        icon={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                        label={isBookmarked ? 'Remove from vault' : 'Save to vault'}
                        onPress={updateBookmarks}
                        tone={isBookmarked ? 'paper' : 'ink'}
                    />
                </View>



                {/* Title card — the masterplan's dashed red panel */}
                <DashedCard style={{ marginHorizontal: grid.screenPadding, marginTop: -140, alignItems: 'center' }}>
                    <Display variant="displayXl" color={colors.paper} align="center" >
                        {movie.title}
                    </Display>

                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            justifyContent: 'center',
                            gap: 7,
                            marginTop: 12,
                        }}
                    >
                        {country ? <Chip label={country} /> : null}
                        {movie.genres?.[0] ? <Chip label={movie.genres[0].name} /> : null}
                        {runtime ? <Chip label={runtime} /> : null}
                        {year ? <Chip label={year} /> : null}
                    </View>

                    {movie.tagline ? (
                        <Text
                            variant="script"
                            color={colors.paper}
                            style={{ marginTop: 18, textAlign: 'center' }}
                        >
                            {movie.tagline}
                        </Text>
                    ) : null}
                </DashedCard>

                <FilmStrip height={12} pitch={18} style={{ marginTop: 22 }} />

                {/* Score stub */}
                <View style={{ paddingHorizontal: grid.screenPadding, marginTop: 20 }}>
                    <TicketCard pageBackground={colors.ink} showTearLine={false} notchOffset={54}>
                        <View
                            style={{
                                padding: 18,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 14,
                            }}
                        >
                            <View style={{ gap: 10 }}>
                                <Text variant="osd" color={withAlpha(colors.ink, 0.5)}>Audience score</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                    <View style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="star" size={56} color={colors.blood} style={{ position: 'absolute' }} />
                                        <Text variant="label" color={colors.paper} style={{ fontSize: 16, letterSpacing: 0, fontWeight: '900', marginTop: 3 }}>
                                            {movie.vote_average.toFixed(1)}
                                        </Text>
                                    </View>
                                    <View>
                                        <RatingStars value={movie.vote_average} size={14} />
                                        <Text variant="bodySm" color={withAlpha(colors.ink, 0.6)} style={{ marginTop: 4 }}>
                                            {movie.vote_count.toLocaleString()} votes
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <Barcode value={movie.id} height={50} bars={18} />
                        </View>
                    </TicketCard>
                </View>

                {/* About film */}
                {movie.overview ? (
                    <TornSection background={colors.blood} variant="flame" seed={5} style={{ marginTop: 26 }}>
                        <View style={{ paddingHorizontal: grid.screenPadding, paddingVertical: 18, gap: 12 }}>
                            <Display variant="display" color={colors.paper} align="center" textStyle={{ letterSpacing: 2 }}>About film</Display>

                            <Text
                                variant="body"
                                color={colors.paper}
                                numberOfLines={aboutExpanded ? undefined : 5}
                            >
                                {movie.overview}
                            </Text>

                            {movie.overview.length > 220 ? (
                                <Pressable
                                    onPress={() => setAboutExpanded((prev) => !prev)}
                                    accessibilityRole="button"
                                    accessibilityLabel={aboutExpanded ? 'Show less' : 'Show more'}
                                    style={({ pressed }) => ({
                                        alignSelf: 'flex-start',
                                        backgroundColor: colors.noir,
                                        borderRadius: radius.pill,
                                        paddingHorizontal: 18,
                                        paddingVertical: 9,
                                        transform: [{ translateY: pressed ? 2 : 0 }],
                                    })}
                                >
                                    <Text variant="label" color={colors.paper}>
                                        {aboutExpanded ? 'See less' : 'See more'}
                                    </Text>
                                </Pressable>
                            ) : null}
                        </View>
                    </TornSection>
                ) : null}

                {/* Genres */}
                {movie.genres?.length ? (
                    <View
                        style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 7,
                            paddingHorizontal: grid.screenPadding,
                            marginTop: 22,
                        }}
                    >
                        {movie.genres.map((genre) => (
                            <Chip key={genre.id} label={genre.name} tone="outline" />
                        ))}
                    </View>
                ) : null}

                {/* Everything from here down arrives inside the single detail
                    request's append_to_response — cast, providers, videos and
                    reviews cost no extra round trips. */}
                {movie.credits?.cast?.length ? (
                    <SectionBlock
                        title="Cast"
                        subtitle="Long-press to block someone"
                        bleed
                        style={{ marginTop: 28 }}
                        titleStyle={{ letterSpacing: 3 }}
                    >
                        <CastRow cast={movie.credits.cast} />
                    </SectionBlock>
                ) : null}

                {providers.providers.length > 0 ? (
                    <SectionBlock title="Where to watch" style={{ marginTop: 28 }} titleStyle={{ letterSpacing: 3 }}>
                        <ProviderRow data={providers} region={DEFAULT_WATCH_REGION} />
                    </SectionBlock>
                ) : null}

                {movie.videos?.results?.length ? (
                    <SectionBlock
                        title="On video"
                        subtitle="Trailers and featurettes"
                        bleed
                        style={{ marginTop: 28 }}
                        titleStyle={{ letterSpacing: 3 }}
                    >
                        <VideoRow videos={movie.videos.results} />
                    </SectionBlock>
                ) : null}

                {movie.reviews?.results?.length ? (
                    <SectionBlock
                        title="Notes from Viewers"
                        subtitle="Real audience reviews"
                        bleed
                        style={{ marginTop: 28 }}
                        titleStyle={{ letterSpacing: 3 }}
                    >
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: grid.screenPadding, gap: 12 }}
                        >
                            {movie.reviews.results.slice(0, 8).map((review) => (
                                <ReviewCard key={review.id} review={review} width={286} />
                            ))}
                        </ScrollView>
                    </SectionBlock>
                ) : null}

                {/* On file */}
                <View style={{ paddingHorizontal: grid.screenPadding, marginTop: 26 }}>
                    <TicketCard pageBackground={colors.ink} showTearLine={false} notchOffset={40}>
                        <View style={{ padding: 18, gap: 14 }}>
                            <Text variant="label" color={withAlpha(colors.ink, 0.55)}>On file</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, columnGap: 12 }}>
                                <DetailCell label="Language" value={movie.original_language.toUpperCase()} />
                                <DetailCell
                                    label="Budget"
                                    value={movie.budget ? formatCurrency(movie.budget) : 'Unlisted'}
                                />
                                <DetailCell
                                    label="Revenue"
                                    value={movie.revenue ? formatCurrency(movie.revenue) : 'Unlisted'}
                                />
                                <DetailCell
                                    label="Country"
                                    value={
                                        movie.production_countries?.map((c) => c.name).join(', ') ||
                                        'Unlisted'
                                    }
                                />
                            </View>
                        </View>
                    </TicketCard>
                </View>

                {/* Production */}
                {movie.production_companies?.length ? (
                    <View style={{ marginTop: 26 }}>
                        <Display
                            variant="displaySm"
                            style={{ paddingHorizontal: grid.screenPadding, marginBottom: 12 }}
                            textStyle={{ letterSpacing: 2 }}
                        >
                            Produced by
                        </Display>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingHorizontal: grid.screenPadding, gap: 10 }}
                        >
                            {movie.production_companies.map((company) => (
                                <View
                                    key={company.id}
                                    style={{
                                        minWidth: 116,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                        padding: 14,
                                        backgroundColor: colors.paper,
                                        borderRadius: radius.sm,
                                    }}
                                >
                                    {company.logo_path ? (
                                        <Image
                                            source={{ uri: logoUrl(company.logo_path, 'w185')! }}
                                            style={{ width: 66, height: 30 }}
                                            contentFit="contain"
                                        />
                                    ) : (
                                        <Ionicons name="business" size={22} color={colors.ink} />
                                    )}
                                    <Text
                                        variant="osd"
                                        color={withAlpha(colors.ink, 0.7)}
                                        numberOfLines={2}
                                        style={{ textAlign: 'center', maxWidth: 100 }}
                                    >
                                        {company.name}
                                    </Text>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                ) : null}

                {movie.homepage ? (
                    <View style={{ paddingHorizontal: grid.screenPadding, marginTop: 32 }}>
                        <Pressable
                            onPress={() => Linking.openURL(movie.homepage as string)}
                            accessibilityRole="button"
                            accessibilityLabel="Visit homepage"
                            style={({ pressed }) => ({
                                backgroundColor: colors.blood,
                                paddingVertical: 18,
                                paddingHorizontal: 20,
                                borderRadius: radius.md,
                                borderWidth: 3,
                                borderColor: colors.noir,
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexDirection: 'row',
                                gap: 10,
                                transform: [{ translateY: pressed ? 3 : 0 }],
                                shadowColor: colors.blood,
                                shadowOffset: { width: 0, height: pressed ? 0 : 6 },
                                shadowOpacity: 0.6,
                                shadowRadius: 10,
                                elevation: pressed ? 0 : 8,
                            })}
                        >
                            <Ionicons name="globe-outline" size={24} color={colors.paper} />
                            <Display variant="displaySm" color={colors.paper} style={{ marginTop: 2 }}>
                                VISIT HOMEPAGE
                            </Display>
                        </Pressable>
                    </View>
                ) : null}

                <TornEdge fill={colors.blood} seed={9} style={{ marginTop: 34 }} />
                <View style={{ backgroundColor: colors.blood, paddingVertical: 14 }}>
                    <Text variant="osd" color={colors.paper} style={{ textAlign: 'center' }}>
                        [ END OF REEL ]
                    </Text>
                </View>
            </ScrollView>
        </View>
    )
}

export default MovieDetails

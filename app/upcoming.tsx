import { useMemo } from "react";
import { ActivityIndicator, Pressable, SectionList, View } from "react-native";
import { Image } from "expo-image";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Display } from "@/components/ui/Display";
import { FilmStrip } from "@/components/kino/FilmStrip";
import { TicketCard } from "@/components/kino/TicketCard";
import { RatingStars } from "@/components/kino/RatingStars";

import { useUpcomingMovies } from "@/lib/queries/movies";
import { groupByMonth, shortDate } from "@/lib/format/groupByMonth";
import { posterUrlOrPlaceholder } from "@/lib/api/tmdb/images";
import type { Title } from "@/lib/api/tmdb/types";
import { colors, grid, radius, withAlpha } from "@/theme/tokens";

const UpcomingCard = ({ title }: { title: Title }) => {
    const { day, month } = shortDate(title.date);

    return (
        <Link href={`/movies/${title.id}` as never} asChild>
            <Pressable
                accessibilityRole="link"
                accessibilityLabel={`${title.title}, releasing ${month} ${day}`}
                style={{
                    flexDirection: 'row',
                    marginBottom: 14,
                    backgroundColor: colors.inkRaised,
                    borderRadius: radius.md,
                    borderWidth: 2,
                    borderColor: colors.noir,
                    overflow: 'hidden',
                }}
            >
                <Image
                    source={{ uri: posterUrlOrPlaceholder(title.posterPath, 'w342') }}
                    style={{ width: 92, height: 138 }}
                    contentFit="cover"
                    transition={180}
                    cachePolicy="memory-disk"
                />

                {/* Date stub */}
                <View
                    style={{
                        backgroundColor: colors.blood,
                        paddingHorizontal: 9,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Text variant="displaySm" color={colors.paper}>{day}</Text>
                    <Text variant="osd" color={withAlpha(colors.paper, 0.85)}>{month}</Text>
                </View>

                <View style={{ flex: 1, padding: 12, justifyContent: 'space-between' }}>
                    <View style={{ gap: 4 }}>
                        <Text variant="heading" numberOfLines={2}>{title.title}</Text>
                        <Text
                            variant="bodySm"
                            color={withAlpha(colors.paper, 0.5)}
                            numberOfLines={3}
                        >
                            {title.overview || 'No description on file.'}
                        </Text>
                    </View>

                    {title.voteAverage > 0 ? (
                        <RatingStars value={title.voteAverage} size={11} />
                    ) : null}
                </View>
            </Pressable>
        </Link>
    );
};

const Upcoming = () => {
    const router = useRouter();
    const { data: movies = [], isPending, error } = useUpcomingMovies(3);

    const sections = useMemo(
        () =>
            groupByMonth(movies).map((group) => ({
                title: group.title,
                data: group.items,
            })),
        [movies]
    );

    return (
        <Screen>
            <View style={{ paddingHorizontal: grid.screenPadding, paddingTop: 6 }}>
                <Pressable
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
                        marginBottom: 12,
                    }}
                >
                    <Ionicons name="arrow-back" size={19} color={colors.paper} />
                </Pressable>

                <Display variant="display">Coming soon</Display>
                <Text
                    variant="script"
                    color={colors.blood}
                    style={{ marginTop: -2, marginLeft: 4, transform: [{ rotate: '-3deg' }] }}
                >
                    next at the vault
                </Text>
                <FilmStrip height={10} pitch={16} style={{ marginTop: 14 }} />
            </View>

            {isPending ? (
                <ActivityIndicator size="large" color={colors.blood} style={{ marginTop: 50 }} />
            ) : error ? (
                <Text
                    variant="body"
                    color={colors.blood}
                    style={{ textAlign: 'center', marginTop: 30, paddingHorizontal: grid.screenPadding }}
                >
                    Couldn&apos;t load the schedule.
                </Text>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => String(item.id)}
                    showsVerticalScrollIndicator={false}
                    stickySectionHeadersEnabled={false}
                    contentContainerStyle={{
                        paddingHorizontal: grid.screenPadding,
                        paddingTop: 20,
                        paddingBottom: 130,
                    }}
                    renderSectionHeader={({ section: { title } }) => (
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 10,
                                marginBottom: 14,
                                marginTop: 6,
                            }}
                        >
                            <View
                                style={{
                                    backgroundColor: colors.paper,
                                    borderWidth: 2,
                                    borderColor: colors.noir,
                                    borderRadius: radius.sm,
                                    paddingHorizontal: 10,
                                    paddingVertical: 3,
                                }}
                            >
                                <Text variant="label" color={colors.ink}>{title}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <FilmStrip height={8} pitch={13} />
                            </View>
                        </View>
                    )}
                    renderItem={({ item }) => <UpcomingCard title={item} />}
                    ListEmptyComponent={
                        <TicketCard pageBackground={colors.ink} style={{ marginTop: 20 }}>
                            <View style={{ padding: 22, alignItems: 'center', gap: 10 }}>
                                <Ionicons name="film-outline" size={40} color={colors.blood} />
                                <Text variant="displaySm" color={colors.ink}>All caught up</Text>
                                <Text
                                    variant="bodySm"
                                    color={withAlpha(colors.ink, 0.7)}
                                    style={{ textAlign: 'center' }}
                                >
                                    Nothing scheduled yet. Check back soon.
                                </Text>
                            </View>
                        </TicketCard>
                    }
                />
            )}
        </Screen>
    );
};

export default Upcoming;

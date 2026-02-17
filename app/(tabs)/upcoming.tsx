import { View, Text, ActivityIndicator, SectionList, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

import AuroraBackground from "../../components/AuroraBackground";
import useFetch from "@/services/useFetch";
import { fetchUpcomingMovies } from "@/services/api";
import { icons } from "@/constants/icons";
import { useMemo } from "react";

interface MonthSection {
    title: string;
    data: Movie[][];
}

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const UpcomingMovieCard = ({ movie }: { movie: Movie }) => {
    const releaseDate = movie.release_date
        ? new Date(movie.release_date)
        : null;

    const dayStr = releaseDate
        ? releaseDate.getDate().toString()
        : '?';

    const monthStr = releaseDate
        ? MONTH_NAMES[releaseDate.getMonth()].substring(0, 3).toUpperCase()
        : '';

    return (
        <Link href={`/movies/${movie.id}`} asChild>
            <TouchableOpacity
                activeOpacity={0.85}
                className="flex-row mb-4 rounded-2xl overflow-hidden"
                style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
            >
                {/* Poster */}
                <Image
                    source={{
                        uri: movie.poster_path
                            ? (movie.poster_path.startsWith('http')
                                ? movie.poster_path
                                : `https://image.tmdb.org/t/p/w300${movie.poster_path}`)
                            : 'https://placehold.com/300x450/1a1a1a/ffffff.png'
                    }}
                    className="w-24 h-36 rounded-l-2xl"
                    resizeMode="cover"
                />

                {/* Info */}
                <View className="flex-1 p-3 justify-between">
                    <View>
                        <Text className="text-white text-sm font-bold mb-1" numberOfLines={2}>
                            {movie.title}
                        </Text>
                        <Text className="text-white/40 text-xs mb-2" numberOfLines={3}>
                            {movie.overview || 'No description available.'}
                        </Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                        {/* Date Badge */}
                        <View
                            className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full"
                            style={{
                                backgroundColor: 'rgba(255, 69, 0, 0.12)',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 69, 0, 0.2)',
                            }}
                        >
                            <Ionicons name="calendar-outline" size={11} color="#FF4500" />
                            <Text className="text-accent text-[10px] font-bold">
                                {monthStr} {dayStr}
                            </Text>
                        </View>

                        {/* Rating */}
                        {movie.vote_average > 0 ? (
                            <View className="flex-row items-center gap-1">
                                <Text className="text-yellow-400 text-xs">★</Text>
                                <Text className="text-white/50 text-xs">{movie.vote_average.toFixed(1)}</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </TouchableOpacity>
        </Link>
    );
};

const Upcoming = () => {
    const {
        data: movies = [],
        loading,
        error,
    } = useFetch(fetchUpcomingMovies);

    // Group movies by month — only show movies from today onwards
    const sections = useMemo((): MonthSection[] => {
        if (!movies || movies.length === 0) return [];

        // Use current date for filtering
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Filter out movies without release dates, deduplicate, and only keep future releases
        const seen = new Set<number>();
        const validMovies = movies.filter((movie) => {
            if (!movie.release_date || seen.has(movie.id)) return false;
            seen.add(movie.id);
            const releaseDate = new Date(movie.release_date);
            return releaseDate >= today;
        });

        // Sort by release date
        validMovies.sort((a, b) =>
            new Date(a.release_date).getTime() - new Date(b.release_date).getTime()
        );

        // Group by month-year
        const groups: Record<string, Movie[]> = {};
        const groupOrder: string[] = [];

        validMovies.forEach((movie) => {
            const date = new Date(movie.release_date);
            const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
            if (!groups[key]) {
                groups[key] = [];
                groupOrder.push(key);
            }
            groups[key].push(movie);
        });

        // Convert to SectionList format, maintaining chronological order
        return groupOrder.map((key) => {
            const movieList = groups[key];
            const date = new Date(movieList[0].release_date);
            return {
                title: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
                data: movieList.map(m => [m]),
            };
        });
    }, [movies]);

    return (
        <View className="flex-1 bg-primary">
            <View className="absolute inset-0">
                <AuroraBackground
                    colorStops={[
                        "#000000",
                        "#1A1A1A",
                        "#FF4500",
                        "#121212"
                    ]}
                    blend={5}
                    amplitude={1.0}
                    speed={0.5}
                />
            </View>

            <View className="flex-1 px-5">
                {/* Logo */}
                <View className="w-full flex-row justify-center mt-20 mb-5 items-center">
                    <Image source={icons.logo} className="w-16 h-16" resizeMode="contain" />
                </View>

                {/* Header */}
                <View className="flex-row items-center justify-between mb-5">
                    <View>
                        <View className="flex-row items-center gap-2 mb-1">
                            <Text className="text-white text-xl font-black tracking-tight">Upcoming</Text>
                            <Text style={{ fontSize: 18 }}>🎥</Text>
                        </View>
                        <Text className="text-white/30 text-xs font-medium">Movies releasing soon</Text>
                    </View>
                </View>

                <View
                    className="mb-4"
                    style={{
                        height: 1,
                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    }}
                />

                {loading && (
                    <ActivityIndicator
                        size="large"
                        color="#FF4500"
                        className="my-10"
                    />
                )}

                {error && (
                    <Text className="text-red-500 px-5 my-3 text-center">
                        Something went wrong
                    </Text>
                )}

                {!loading && !error && (
                    <SectionList
                        sections={sections}
                        keyExtractor={(item, index) => item[0]?.id?.toString() || index.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                        stickySectionHeadersEnabled={false}
                        renderSectionHeader={({ section: { title } }) => (
                            <View className="flex-row items-center gap-3 mb-4 mt-2">
                                <View
                                    className="px-3 py-1.5 rounded-full"
                                    style={{
                                        backgroundColor: 'rgba(255, 69, 0, 0.12)',
                                        borderWidth: 1,
                                        borderColor: 'rgba(255, 69, 0, 0.2)',
                                    }}
                                >
                                    <Text className="text-accent text-xs font-bold">{title}</Text>
                                </View>
                                <View
                                    className="flex-1"
                                    style={{
                                        height: 1,
                                        backgroundColor: 'rgba(255, 255, 255, 0.06)',
                                    }}
                                />
                            </View>
                        )}
                        renderItem={({ item }) => (
                            <UpcomingMovieCard movie={item[0]} />
                        )}
                        ListEmptyComponent={
                            <View className="flex-1 justify-center items-center mt-10">
                                <View className="w-40 h-40 bg-white/10 rounded-full justify-center items-center mb-6 border border-white/20">
                                    <Ionicons name="film-outline" size={64} color="white" style={{ opacity: 0.8 }} />
                                </View>
                                <Text className="text-2xl text-white font-bold text-center mb-2">
                                    All Caught Up
                                </Text>
                                <Text className="text-gray-400 text-center text-base px-10">
                                    No upcoming movies found. Check back later!
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
};

export default Upcoming;

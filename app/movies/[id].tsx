
import { View, Text, Image, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Platform, StatusBar } from 'react-native'
import React from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import useFetch from '@/services/useFetch'
import { fetchMovieDetails } from '@/services/api'
import { icons } from '@/constants/icons'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const MovieDetails = () => {
    const { id } = useLocalSearchParams()
    const router = useRouter()
    const { data: movie, loading, error } = useFetch(() => fetchMovieDetails(id as string))
    const insets = useSafeAreaInsets();

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value)
    }

    if (loading) {
        return (
            <View className="flex-1 bg-primary items-center justify-center">
                <ActivityIndicator size="large" color="#FF4500" />
            </View>
        )
    }

    if (error) {
        return (
            <View className="flex-1 bg-primary items-center justify-center px-4">
                <Text className="text-white text-lg text-center mb-4">Failed to load movie details</Text>
                <TouchableOpacity onPress={() => router.back()} className="bg-accent px-6 py-3 rounded-full">
                    <Text className="text-white font-semibold">Go Back</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <View className="flex-1 bg-primary">
            <StatusBar hidden />
            {/* Fixed Back Button */}
            <TouchableOpacity
                onPress={() => router.back()}
                style={{ top: Platform.OS === 'ios' ? insets.top : insets.top + 10, left: 16, zIndex: 100 }}
                className="absolute bg-black/60 rounded-full p-3 backdrop-blur-md border border-white/20 shadow-lg"
            >
                <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Header Section with Backdrop */}
                <View className="relative h-[450px] w-full">
                    <Image
                        source={{
                            uri: movie?.backdrop_path
                                ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
                                : movie?.poster_path
                                    ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                                    : 'https://placehold.co/600x900/1a1a1a/ffffff.png'
                        }}
                        className="w-full h-full"
                        resizeMode="cover"
                        style={{ opacity: 0.85 }}
                    />

                    {/* Gradient Overlay */}
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.5)', '#000000']}
                        className="absolute w-full h-full"
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                    />

                    {/* Title and Key Info Overlay */}
                    <View className="absolute bottom-0 left-0 right-0 px-4 pb-6">
                        {/* Title */}
                        <Text className="text-white text-3xl font-bold mb-2 shadow-sm text-center tracking-tight">
                            {movie?.title}
                        </Text>

                        {/* Tagline */}
                        {movie?.tagline && (
                            <Text className="text-light-300 text-sm font-medium italic text-center mb-5 opacity-90">
                                "{movie.tagline}"
                            </Text>
                        )}

                        <View className="flex-row justify-center gap-4 mt-4 w-full px-2">
                            {movie?.vote_average && (
                                <View className="flex-1 items-center bg-dark-100/80 py-4 rounded-2xl border border-white/10 backdrop-blur-xl shadow-lg">
                                    <View className="bg-yellow-500/20 p-3 rounded-full mb-2">
                                        <Ionicons name="star" size={24} color="#FFD700" />
                                    </View>
                                    <Text className="text-white font-bold text-xl">
                                        {movie.vote_average.toFixed(1)}
                                    </Text>
                                    <Text className="text-light-300 text-xs font-medium mt-1">
                                        {movie.vote_count} votes
                                    </Text>
                                </View>
                            )}

                            {movie?.runtime && (
                                <View className="flex-1 items-center bg-dark-100/80 py-4 rounded-2xl border border-white/10 backdrop-blur-xl shadow-lg">
                                    <View className="bg-white/10 p-3 rounded-full mb-2">
                                        <Ionicons name="time" size={24} color="#E0E0E0" />
                                    </View>
                                    <Text className="text-white font-bold text-xl">
                                        {Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m
                                    </Text>
                                    <Text className="text-light-300 text-xs font-medium mt-1">
                                        Duration
                                    </Text>
                                </View>
                            )}

                            {movie?.release_date && (
                                <View className="flex-1 items-center bg-dark-100/80 py-4 rounded-2xl border border-white/10 backdrop-blur-xl shadow-lg">
                                    <View className="bg-white/10 p-3 rounded-full mb-2">
                                        <Ionicons name="calendar" size={24} color="#E0E0E0" />
                                    </View>
                                    <Text className="text-white font-bold text-xl">
                                        {movie.release_date.split('-')[0]}
                                    </Text>
                                    <Text className="text-light-300 text-xs font-medium mt-1">
                                        Released
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Content Body */}
                <View className="space-y-6 flex gap-2 py-2 px-4 ">

                    {/* Genres */}
                    {movie?.genres && movie.genres.length > 0 && (
                        <View className="flex-row flex-wrap justify-center gap-2">
                            {movie.genres.map((genre: any) => (
                                <View key={genre.id} className="bg-orange-600 border border-white/10 px-3 py-1.5 rounded-full">
                                    <Text className="text-light-200 text-xs font-medium">{genre.name}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Overview */}
                    {movie?.overview && (
                        <View className="bg-dark-100 p-5 rounded-2xl border border-white/5 space-y-3">
                            <Text className="text-accent text-lg font-bold">Overview</Text>
                            <Text className="text-light-200 text-base leading-relaxed tracking-wide">{movie.overview}</Text>
                        </View>
                    )}

                    {/* Details Grid */}
                    <View className="bg-dark-100 p-5 rounded-2xl border border-white/5">
                        <Text className="text-accent text-lg font-bold mb-4">Details</Text>

                        <View className="flex-row flex-wrap justify-between gap-y-4">
                            {/* Status */}
                            <View className="w-[48%] bg-primary/40 p-3 rounded-xl border border-white/5">
                                <Text className="text-light-300 text-xs mb-1 font-medium">Status</Text>
                                <Text className="text-white font-semibold">{movie?.status || 'N/A'}</Text>
                            </View>

                            {/* Original Language */}
                            <View className="w-[48%] bg-primary/40 p-3 rounded-xl border border-white/5">
                                <Text className="text-light-300 text-xs mb-1 font-medium">Language</Text>
                                <Text className="text-white font-semibold uppercase">{movie?.original_language || 'N/A'}</Text>
                            </View>

                            {/* Budget */}
                            <View className="w-[48%] bg-primary/40 p-3 rounded-xl border border-white/5">
                                <Text className="text-light-300 text-xs mb-1 font-medium">Budget</Text>
                                <Text className="text-white font-semibold">{movie?.budget ? formatCurrency(movie.budget) : 'N/A'}</Text>
                            </View>

                            {/* Revenue */}
                            <View className="w-[48%] bg-primary/40 p-3 rounded-xl border border-white/5">
                                <Text className="text-light-300 text-xs mb-1 font-medium">Revenue</Text>
                                <Text className="text-white font-semibold">{movie?.revenue ? formatCurrency(movie.revenue) : 'N/A'}</Text>
                            </View>

                            {/* Production Countries */}
                            <View className="w-[48%] bg-primary/40 p-3 rounded-xl border border-white/5">
                                <Text className="text-light-300 text-xs mb-1 font-medium">Country</Text>
                                <Text className="text-white font-semibold flex-wrap text-sm" numberOfLines={2}>
                                    {movie?.production_countries?.map(c => c.name).join(', ') || 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Collection Info */}
                    {movie?.belongs_to_collection && (
                        <View className="bg-dark-100/50 p-4  rounded-2xl border border-accent/20">
                            <Text className="text-accent text-lg font-bold mb-3">Collection</Text>
                            <View className="flex-row items-center">
                                {movie.belongs_to_collection.poster_path && (
                                    <Image
                                        source={{ uri: `https://image.tmdb.org/t/p/w200${movie.belongs_to_collection.poster_path}` }}
                                        className="w-16 h-24 rounded-lg mr-4"
                                        resizeMode="cover"
                                    />
                                )}
                                <View className="flex-1">
                                    <Text className="text-white font-bold text-lg mb-1">{movie.belongs_to_collection.name}</Text>
                                    <Text className="text-light-300 text-xs">Part of the collection</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Production Companies */}
                    {movie?.production_companies && movie.production_companies.length > 0 && (
                        <View className="bg-dark-100 p-5 rounded-2xl border border-white/5">
                            <Text className="text-accent text-lg font-bold mb-4">Production</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerClassName="gap-3"
                            >
                                {movie.production_companies.map((company: any) => (
                                    <View key={company.id} className="bg-white/5 p-4 rounded-xl items-center justify-center min-w-[110px] border border-white/5">
                                        {company.logo_path ? (
                                            <Image
                                                source={{ uri: `https://image.tmdb.org/t/p/w200${company.logo_path}` }}
                                                className="w-16 h-10 mb-2"
                                                resizeMode="contain"
                                                style={{ tintColor: 'white' }}
                                            />
                                        ) : (
                                            <Ionicons name="business" size={24} color="#9E9E9E" className="mb-2" />
                                        )}
                                        <Text className="text-light-200 text-xs text-center font-medium mt-1 max-w-[100px]" numberOfLines={2}>
                                            {company.name}
                                        </Text>
                                        {company.origin_country && (
                                            <Text className="text-light-300 text-[10px] text-center mt-1 opacity-60">
                                                {company.origin_country}
                                            </Text>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Spoken Languages */}
                    {movie?.spoken_languages && movie.spoken_languages.length > 0 && (
                        <View className="bg-dark-100 p-5 rounded-2xl border border-white/5">
                            <Text className="text-accent text-lg font-bold mb-3">Spoken Languages</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {movie.spoken_languages.map((lang: any, index: number) => (
                                    <View key={index} className="flex-row items-center bg-primary/30 px-3 py-1.5 rounded-full border border-white/5">
                                        <Ionicons name="chatbubble-ellipses-outline" size={14} color="#9E9E9E" />
                                        <Text className="text-light-200 ml-2 text-sm font-medium">{lang.english_name || lang.name}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Links */}
                    {movie?.homepage && (
                        <TouchableOpacity
                            onPress={() => Linking.openURL(movie.homepage as string)}
                            className="flex-row items-center justify-center bg-accent py-4 rounded-2xl active:opacity-90 shadow-lg shadow-accent/20"
                        >
                            <Ionicons name="globe-outline" size={22} color="white" />
                            <Text className="text-white font-bold ml-2 text-lg">Visit Homepage</Text>
                        </TouchableOpacity>
                    )}

                    {/* Bottom Spacer */}
                    <View className="h-6" />
                </View>
            </ScrollView>
        </View>
    )
}

export default MovieDetails

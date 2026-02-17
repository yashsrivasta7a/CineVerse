import { View, TouchableOpacity, Image, Text, Dimensions } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = SCREEN_WIDTH * 0.44
const CARD_HEIGHT = CARD_WIDTH * 1.45

const TrendingMovieCard = ({ movie: { movie_id, poster_url, title, searchTerm, count }, index }: TrendingCardProps) => {
    const isFirst = index === 0

    return (
        <Link href={`/movies/${movie_id}`} asChild>
            <TouchableOpacity
                activeOpacity={0.9}
                style={{
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT,
                }}
            >
                {/* Card Container */}
                <View
                    className="flex-1 rounded-3xl overflow-hidden"
                    style={{
                        shadowColor: isFirst ? '#FF4500' : '#000',
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: isFirst ? 0.4 : 0.3,
                        shadowRadius: 16,
                        elevation: 12,
                    }}
                >
                    {/* Poster Image */}
                    <Image
                        source={{ uri: poster_url }}
                        className="w-full h-full absolute"
                        resizeMode="cover"
                    />

                    {/* Gradient Overlay — Bottom */}
                    <LinearGradient
                        colors={[
                            'transparent',
                            'rgba(0,0,0,0.1)',
                            'rgba(0,0,0,0.6)',
                            'rgba(0,0,0,0.92)',
                        ]}
                        locations={[0, 0.4, 0.7, 1]}
                        className="absolute inset-0"
                    />

                    {/* Top Gradient for rank badge */}
                    <LinearGradient
                        colors={['rgba(0,0,0,0.5)', 'transparent']}
                        className="absolute top-0 left-0 right-0 h-24"
                    />

                    {/* Rank Badge */}
                    <View className="absolute top-3 left-3 flex-row items-center gap-2">
                        <View
                            className="px-2 py-1 rounded-full flex-row items-center gap-1"
                            style={{
                                backgroundColor: index === 0
                                    ? 'rgba(255, 215, 0, 0.2)'
                                    : index === 1
                                        ? 'rgba(192, 192, 192, 0.2)'
                                        : index === 2
                                            ? 'rgba(205, 127, 50, 0.2)'
                                            : 'rgba(255, 255, 255, 0.1)',
                                borderWidth: 1,
                                borderColor: index === 0
                                    ? 'rgba(255, 215, 0, 0.4)'
                                    : index === 1
                                        ? 'rgba(192, 192, 192, 0.4)'
                                        : index === 2
                                            ? 'rgba(205, 127, 50, 0.4)'
                                            : 'rgba(255, 255, 255, 0.15)',
                            }}
                        >
                            <Text
                                className="text-xs font-black"
                                style={{
                                    color: index === 0
                                        ? '#FFD700'
                                        : index === 1
                                            ? '#E0E0E0'
                                            : index === 2
                                                ? '#CD7F32'
                                                : '#fff',
                                }}
                            >
                                #{index + 1}
                            </Text>
                        </View>
                    </View>

                    {/* Trending indicator — top right */}
                    {isFirst && (
                        <View
                            className="absolute top-3 right-3 flex-row items-center gap-1 px-2 py-1 rounded-full"
                            style={{
                                backgroundColor: 'rgba(255, 69, 0, 0.25)',
                                borderWidth: 1,
                                borderColor: 'rgba(255, 69, 0, 0.4)',
                            }}
                        >
                            <Ionicons name="trending-up" size={10} color="#FF4500" />
                            <Text className="text-accent text-[8px] font-bold">HOT</Text>
                        </View>
                    )}

                    {/* Bottom Content */}
                    <View className="absolute bottom-0 left-0 right-0 p-3">
                        {/* Title */}
                        <Text
                            className="text-white text-sm font-bold mb-1"
                            numberOfLines={2}
                            style={{
                                textShadowColor: 'rgba(0,0,0,0.8)',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 4,
                            }}
                        >
                            {title || searchTerm || ''}
                        </Text>

                        {/* Meta Info Row */}
                        <View className="flex-row items-center gap-1">
                            <Ionicons name="search" size={9} color="rgba(255,255,255,0.5)" />
                            <Text className="text-white/50 text-[10px]">
                                {count ? `${count.toLocaleString()} searches` : 'Trending'}
                            </Text>
                        </View>
                    </View>

                    {/* Edge glow for first card */}
                    {isFirst && (
                        <View
                            className="absolute inset-0 rounded-3xl"
                            style={{
                                borderWidth: 1.5,
                                borderColor: 'rgba(255, 69, 0, 0.3)',
                            }}
                        />
                    )}
                </View>
            </TouchableOpacity>
        </Link>
    )
}

export default TrendingMovieCard
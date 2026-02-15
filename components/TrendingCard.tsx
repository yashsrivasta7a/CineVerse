import { View, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

const TrendingMovieCard = ({ movie: { movie_id, poster_url } }: TrendingCardProps) => {
    return (
        <Link href={`/movies/${movie_id}`} asChild>
            <TouchableOpacity activeOpacity={0.95} className="relative">

                <View className="absolute inset-0 z-10 rounded-xl overflow-hidden">
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.55)']}
                        className="absolute inset-0"
                    />

                    <LinearGradient
                        colors={['#ffb703', '#fb8500', '#c2410c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        className="absolute bottom-0 left-0 right-0 h-[2px]"
                    />
                </View>

                <View className="w-[120px] aspect-[2/3] rounded-xl bg-[#141414] overflow-hidden shadow-xl border border-white/5">
                    <Image
                        source={{ uri: poster_url }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                </View>

            </TouchableOpacity>
        </Link>
    )
}

export default TrendingMovieCard
import { View, Text, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { Link } from 'expo-router'

const MovieCard = ({ title, id, poster_path, vote_average, overview, release_date, backdrop_path }: Movie) => {
    return (
        <Link href={`/movies/${id}`} asChild>
            <TouchableOpacity className='w-full'>
                <Image
                    source={{ uri: poster_path ? `https://image.tmdb.org/t/p/w500${poster_path}` : 'https://placehold.com/600x400/1a1a1a/ffffff.png' }}
                    className="w-full aspect-[2/3] rounded-2xl"
                    resizeMode='cover'
                />
                <Text className='text-white text-sm font-semibold mt-2 px-1' numberOfLines={1}>{title}</Text>
                <View className='flex-row items-center mt-1 px-1'>
                    <Text className='text-yellow-400 text-xs'>★ {vote_average?.toFixed(1) || 'N/A'}</Text>
                </View>
                <View className='px-1'>
                    <Text className='text-white text-xs'>{release_date?.split('-')[0]}</Text>
                    <Text className='text-white text-xs'>{}</Text>
                </View>
            </TouchableOpacity>
        </Link>
    )
}

export default MovieCard
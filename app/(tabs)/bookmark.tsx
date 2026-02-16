import { View, Text, ScrollView, ActivityIndicator } from 'react-native'
import React, { useCallback } from 'react'
import { useUser } from '@clerk/clerk-expo'
import { fetchBookmarkedMovies } from '@/services/api'
import MovieCard from '@/components/MovieCard'
import { useFocusEffect } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import useFetch from '@/services/useFetch'
import { SafeAreaView } from 'react-native-safe-area-context'

const Bookmark = () => {
    const { user } = useUser();

    const { data: bookmarks, loading, error, silentRefetch } = useFetch(
        () => fetchBookmarkedMovies(user?.id || ''),
        !!user?.id
    );

    useFocusEffect(
        useCallback(() => {
            if (user?.id) {
                silentRefetch();
            }
        }, [user, silentRefetch])
    );

    return (
        <SafeAreaView className="flex-1 bg-primary px-4 pt-14">
            <StatusBar style="light" />
            <Text className="text-2xl font-bold text-white mb-6">My Watchlist</Text>

            {loading ? (
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#FF4500" />
                </View>
            ) : !bookmarks || bookmarks.length === 0 ? (
                <View className="flex-1 justify-center items-center mt-[-100px]">
                    <View className="bg-dark-100 p-6 rounded-full mb-6 border border-white/5">
                        <Ionicons name="bookmark-outline" size={64} color="#555" />
                    </View>
                    <Text className="text-white text-xl font-bold mb-2">No bookmarks yet</Text>
                    <Text className="text-light-300 text-center px-10">
                        Movies you bookmark will appear here for easy access.
                    </Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                    <View className="flex-row flex-wrap justify-between gap-y-6">
                        {bookmarks.map((item: any) => (
                            <View key={item.id} style={{ width: '32%' }}>
                                <MovieCard {...item} />
                            </View>
                        ))}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    )
}

export default Bookmark
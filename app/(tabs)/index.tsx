import { useCallback } from "react";
import AuroraBackground from "../../components/AuroraBackground"
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { icons } from "@/constants/icons";
import SearchBar from "../../components/SearchBar";
import { useRouter, useFocusEffect } from "expo-router";
import useFetch from "@/services/useFetch";
import { fetchMovies } from "@/services/api";
import MovieCard from "@/components/MovieCard";
import { getTrendingMovies } from "@/services/appwrite";
import TrendingMovieCard from "../../components/TrendingCard";
import { Ionicons } from "@expo/vector-icons";
import { useUser } from "@clerk/clerk-expo";

export default function Index() {
  const router = useRouter();
  const { user } = useUser();
  const { data: trendingMovies, loading: trendingLoading, error: trendingError, silentRefetch: silentRefetchTrending } = useFetch(getTrendingMovies)
  const { data: movies, loading: moviesLoading, error: moviesError } = useFetch(() => fetchMovies({ query: '' }));

  // Silently refetch trending movies every time the home tab comes into focus
  useFocusEffect(
    useCallback(() => {
      silentRefetchTrending();
    }, [])
  );

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
          blend={7}
          amplitude={1.0}
          speed={0.5}
        />
      </View>


      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} >
        <View className="px-5">

          {/* Header with logo and profile avatar */}
          <View className="w-full flex-row justify-between mt-16 mb-5 items-center">
            <View style={{ width: 40 }} />
            <Image source={icons.logo} className="w-16 h-16" resizeMode="contain" />
            <TouchableOpacity
              onPress={() => router.push('/profile')}
              activeOpacity={0.8}
            >
              {user?.imageUrl ? (
                <Image
                  source={{ uri: user.imageUrl }}
                  className="w-10 h-10 rounded-full"
                  style={{
                    borderWidth: 2,
                    borderColor: 'rgba(255, 69, 0, 0.5)',
                  }}
                />
              ) : (
                <View
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 2,
                    borderColor: 'rgba(255, 69, 0, 0.5)',
                  }}
                >
                  <Ionicons name="person" size={18} color="#FF4500" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View className="mb-8">
            <SearchBar onPress={() => router.push('/search')} placeholder="Search for a movie" />
          </View>
          {moviesLoading || trendingLoading ? (<ActivityIndicator size="large" color="#FF4500" className="mt-10 self-center" />) : moviesError || trendingError ? <Text className="text-white text-center mt-10">Something went wrong</Text> : <View className="flex-1">
            {trendingMovies && (
              <View className="mb-8">
                {/* Premium Section Header */}
                <View className="flex-row items-center justify-between mb-5">
                  <View>
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="text-white text-xl font-black tracking-tight">Top Trending</Text>
                      <Text style={{ fontSize: 18 }}>🔥</Text>
                    </View>
                    <Text className="text-white/30 text-xs font-medium">Most searched movies right now</Text>
                  </View>
                </View>

                {/* Horizontal divider */}
                <View
                  className="mb-5"
                  style={{
                    height: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  }}
                />

                {/* Full-bleed Carousel */}
                <View style={{ marginHorizontal: -20 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    decelerationRate="fast"
                    contentContainerStyle={{
                      paddingHorizontal: 20,
                      gap: 16,
                    }}
                  >
                    {trendingMovies.map((item: any, index: number) => (
                      <TrendingMovieCard
                        key={`${item.movie_id}-${index}`}
                        movie={item}
                        index={index}
                      />
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}
            <>
              <View className="flex-row justify-between items-center mb-5">
                <View>
                  <View className="flex-row items-center gap-2 mb-1">
                    <Text className="text-white text-xl font-black tracking-tight">Latest Movies</Text>
                    <Text style={{ fontSize: 18 }}>🎬</Text>
                  </View>
                  <Text className="text-white/30 text-xs font-medium">Fresh releases for you</Text>
                </View>
              </View>
              <View
                className="mb-4"
                style={{
                  height: 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                }}
              />
              <View style={{ paddingBottom: 90 }}>
                <View className="flex-row flex-wrap justify-between gap-y-6">
                  {movies?.map((item: any) => (
                    <View key={item.id.toString()} style={{ width: '48%' }}>
                      <MovieCard {...item} />
                    </View>
                  ))}
                </View>
              </View>
            </>
          </View>}
        </View>
      </ScrollView>
    </View>
  );
}

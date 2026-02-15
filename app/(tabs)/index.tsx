import { useCallback } from "react";
import AuroraBackground from "../../components/AuroraBackground"
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { icons } from "@/constants/icons";
import SearchBar from "../../components/SearchBar";
import { useRouter, useFocusEffect } from "expo-router";
import useFetch from "@/services/useFetch";
import { fetchMovies } from "@/services/api";
import MovieCard from "@/components/MovieCard";
import { getTrendingMovies } from "@/services/appwrite";
import TrendingMovieCard from "../../components/TrendingCard";
import { Ionicons } from "@expo/vector-icons";

export default function Index() {
  const router = useRouter();
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
            "#FF4500", // Subtle fire glow
            "#121212"
          ]}
          blend={5}
          amplitude={1.0}
          speed={0.5} // Slower, more elegant speed
        />
      </View>


      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} >
        <View className="px-5">
          {/* Modern Vector Logo */}
          <View className="w-full flex-row justify-center mt-20 mb-5 items-center">
            <Image source={icons.logo} className="w-16 h-16" resizeMode="contain" />
          </View>

          <View className="mb-8">
            <SearchBar onPress={() => router.push('/search')} placeholder="Search for a movie" />
          </View>
          {moviesLoading || trendingLoading ? (<ActivityIndicator size="large" color="#FF4500" className="mt-10 self-center" />) : moviesError || trendingError ? <Text className="text-white text-center mt-10">Something went wrong</Text> : <View className="flex-1">
            {trendingMovies && (
              <View className=" mb-6">
                <View className="flex-row items-center gap-2 mb-1">
                  <Text className="text-white text-lg font-bold tracking-wide">Top Trending</Text>
                  <Text style={{ fontSize: 16 }}>🔥</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerClassName="pr-6"
                >
                  {trendingMovies.map((item: any, index: number) => (
                    <View
                      key={`${item.movie_id}-${index}`}
                      className="mr-3 w-[120px]"
                    >
                      <TrendingMovieCard movie={item} index={index} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            <>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-xl font-bold">Latest Movies</Text>
                <Text className="text-accent text-sm font-medium">View All</Text>
              </View>
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

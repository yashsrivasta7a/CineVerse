import AuroraBackground from "../../components/AuroraBackground"
import { ActivityIndicator, FlatList, Image, ScrollView, Text, View } from "react-native";
import { icons } from "@/constants/icons";
import SearchBar from "../../components/SearchBar";
import { useRouter } from "expo-router";
import useFetch from "@/services/useFetch";
import { fetchMovies } from "@/services/api";
import MovieCard from "@/components/MovieCard";

export default function Index() {
  const router = useRouter();

  const { data: movies, loading: moviesLoading, error: moviesError } = useFetch(() => fetchMovies({ query: 'iron man' }));
  return (
    <View className="flex-1 bg-primary">
      <View className="absolute inset-0">
        <AuroraBackground
          colorStops={[
            "#2E1065",
            "#4C1D95",
            "#6D28D9",
            "#A78BFA"
          ]}
          blend={5}
          amplitude={1.0}
          speed={1}
        />
      </View>
      <View className="flex-1 px-5">
        <Image source={icons.logo} className="w-12 h-10 mt-20 mb-5 mx-auto" />
        {moviesLoading ? (<ActivityIndicator size="large" color="white" className="mt-10 self-center" />) : moviesError ? <Text className="text-white text-center mt-10">Something went wrong</Text> : <View className="flex-1 mt-5">
          <SearchBar onPress={() => router.push('/search')} placeholder="Search for the movie" />
          <>
            <View className="flex-row justify-between items-center mt-8 mb-4">
              <Text className="text-white text-xl font-bold">Latest Movies</Text>
              <Text className="text-accent text-sm font-medium">View All</Text>
            </View>
            <FlatList
              data={movies}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperClassName="justify-between gap-4 mb-6"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 90 }}
              renderItem={({ item }) => (
                <View className="flex-1">
                  <MovieCard {...item} />
                </View>
              )}
            />
          </>
        </View>}


      </View>
    </View>
  );
}

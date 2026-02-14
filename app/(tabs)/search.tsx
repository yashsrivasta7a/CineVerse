import { useState, useEffect } from "react";
import { View, Text, ActivityIndicator, FlatList, Image } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

import { icons } from "@/constants/icons";
import AuroraBackground from "../../components/AuroraBackground";

import useFetch from "@/services/useFetch";
import { fetchMovies } from "@/services/api";

import SearchBar from "@/components/SearchBar";
import MovieCard from "@/components/MovieCard";

const Search = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const {
        data: movies = [],
        loading,
        error,
        refetch: loadMovies,
        reset,
    } = useFetch(() => fetchMovies({ query: searchQuery }), false);

    const handleSearch = (text: string) => {
        setSearchQuery(text);
    };

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (searchQuery.trim()) {
                await loadMovies();
            } else {
                reset();
            }
        }, 500)
        return () => clearTimeout(timeoutId);
    }, [searchQuery])

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
                <View className="w-full flex-row justify-center mt-20 mb-5 items-center">
                    <Image source={icons.logo} className="w-12 h-10" />
                </View>

                <View className="mb-8">
                    <SearchBar
                        placeholder="Search for a movie"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoFocus={true}
                    />
                </View>

                {loading && (
                    <ActivityIndicator
                        size="large"
                        color="#ffffff"
                        className="my-3"
                    />
                )}

                {error && (
                    <Text className="text-red-500 px-5 my-3 text-center">
                        Error: {error.message}
                    </Text>
                )}

                {!loading && !error && (
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
                        ListHeaderComponent={
                            searchQuery.trim() && movies?.length > 0 ? (
                                <Text className="text-xl text-white font-bold mb-4">
                                    Search Results for{" "}
                                    <Text className="text-accent">{searchQuery}</Text>
                                </Text>
                            ) : null
                        }
                        ListEmptyComponent={
                            <View className="flex-1 justify-center items-center mt-10">
                                <View className="w-40 h-40 bg-white/10 rounded-full justify-center items-center mb-6 border border-white/20">
                                    <MaterialIcons name="local-movies" size={64} color="white" style={{ opacity: 0.8 }} />
                                </View>
                                <Text className="text-2xl text-white font-bold text-center mb-2">
                                    {searchQuery.trim() ? "No Movies Found" : "Ready to Watch?"}
                                </Text>
                                <Text className="text-gray-400 text-center text-base px-10">
                                    {searchQuery.trim()
                                        ? "We couldn't find any movies matching your search. Try different keywords."
                                        : "Search for your favorite movies, TV shows, and discover new stories."}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>
        </View>
    );
};

export default Search;
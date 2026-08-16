import { useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Display } from "@/components/ui/Display";
import { SearchField } from "@/components/ui/SearchField";
import { TicketCard } from "@/components/kino/TicketCard";
import { Barcode } from "@/components/kino/Barcode";
import { PosterCard } from "@/components/media/PosterCard";

import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useMovieSearch } from "@/lib/queries/movies";
import { useGridWidth } from "@/lib/hooks/useGridWidth";
import { colors, grid, withAlpha } from "@/theme/tokens";

const Search = () => {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Debouncing the value (not the request) is what fixes the race: the query
  // key changes, so an in-flight request for an older term is cancelled.
  const debouncedQuery = useDebouncedValue(searchQuery, 500);
  const trimmedQuery = debouncedQuery.trim();

  const { data: movies = [], isPending, error } = useMovieSearch(debouncedQuery);
  const { itemWidth, gutter } = useGridWidth(2);

  // Searching no longer writes to a database. Trending comes from TMDB now, so
  // the per-query counter write this screen used to make is simply gone.
  const isTyping = searchQuery.trim() !== trimmedQuery;
  const loading = trimmedQuery.length > 0 && (isPending || isTyping);

  return (
    <Screen osd={{ left: 'SEARCH', right: 'TYPE&FIND' }} edges={['top', 'bottom']}>
      <View style={{ paddingHorizontal: grid.screenPadding, paddingTop: 6 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close search"
          style={{
            alignSelf: 'flex-end',
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.inkRaised,
            borderWidth: 2,
            borderColor: colors.noir,
            marginBottom: 6,
          }}
        >
          <Ionicons name="close" size={19} color={colors.paper} />
        </Pressable>

        <Display variant="display">Find a film</Display>
        <Text
          variant="script"
          color={colors.blood}
          style={{ marginTop: -2, marginLeft: 4, transform: [{ rotate: '-3deg' }] }}
        >
          the whole vault
        </Text>

        <SearchField
          ref={inputRef}
          placeholder="Search for a movie"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          style={{ marginTop: 18 }}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.blood} style={{ marginTop: 36 }} />
      ) : null}

      {error ? (
        <Text
          variant="body"
          color={colors.blood}
          style={{ textAlign: 'center', marginTop: 28, paddingHorizontal: grid.screenPadding }}
        >
          {error.message || 'Something went wrong'}
        </Text>
      ) : null}

      {!loading && !error ? (
        <FlatList
          data={movies}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: gutter, paddingHorizontal: grid.screenPadding }}
          contentContainerStyle={{ paddingTop: 22, paddingBottom: 130, rowGap: 24 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PosterCard title={item} style={{ width: itemWidth }} />
          )}
          ListHeaderComponent={
            trimmedQuery && movies.length > 0 ? (
              <Text
                variant="label"
                color={withAlpha(colors.paper, 0.6)}
                style={{ paddingHorizontal: grid.screenPadding, marginBottom: 14 }}
              >
                {movies.length} results for &ldquo;{trimmedQuery}&rdquo;
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ paddingHorizontal: grid.screenPadding, marginTop: 30 }}>
              <TicketCard pageBackground={colors.ink}>
                <View style={{ padding: 22, alignItems: 'center', gap: 10 }}>
                  <Ionicons
                    name={trimmedQuery ? 'ticket-outline' : 'film-outline'}
                    size={40}
                    color={colors.blood}
                  />
                  <Text variant="displaySm" color={colors.ink} style={{ textAlign: 'center' }}>
                    {trimmedQuery ? 'No such reel' : 'Ready to watch?'}
                  </Text>
                  <Text
                    variant="bodySm"
                    color={withAlpha(colors.ink, 0.7)}
                    style={{ textAlign: 'center' }}
                  >
                    {trimmedQuery
                      ? "Nothing in the vault matches that. Try a different title."
                      : 'Search the archive for a film and it lands right here.'}
                  </Text>
                </View>
                <View style={{ alignItems: 'center', paddingBottom: 18, paddingTop: 26 }}>
                  <Barcode value={trimmedQuery || 'kinoroy'} height={22} />
                </View>
              </TicketCard>
            </View>
          }
        />
      ) : null}
    </Screen>
  );
};

export default Search;

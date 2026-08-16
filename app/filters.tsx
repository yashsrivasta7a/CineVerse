import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { FilmStrip } from '@/components/kino/FilmStrip';
import { Display } from '@/components/ui/Display';
import { PressableScale } from '@/components/ui/PressableScale';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useGenres, usePeopleSearch } from '@/lib/queries/reference';
import { filtersAreActive, useFilters } from '@/lib/store/filters';
import { colors, grid, radius, withAlpha } from '@/theme/tokens';

const CURRENT_YEAR = new Date().getFullYear();
const DECADES = [
  { label: 'This year', from: CURRENT_YEAR, to: CURRENT_YEAR },
  { label: '2020s', from: 2020, to: 2029 },
  { label: '2010s', from: 2010, to: 2019 },
  { label: '2000s', from: 2000, to: 2009 },
  { label: '90s', from: 1990, to: 1999 },
  { label: 'Classics', from: 1900, to: 1989 },
];
const RATINGS = [6, 7, 8];

const Pill = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <PressableScale
    onPress={onPress}
    scaleTo={0.96}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected }}
    style={{
      backgroundColor: selected ? colors.paper : colors.inkRaised,
      borderRadius: radius.pill,
      borderWidth: 2,
      borderColor: colors.noir,
      paddingHorizontal: 14,
      paddingVertical: 9,
    }}
  >
    <Text variant="chip" color={selected ? colors.ink : withAlpha(colors.paper, 0.85)}>
      {label}
    </Text>
  </PressableScale>
);

/**
 * Filters — genre, director, year and rating, exactly as the masterplan's
 * ticket card promises.
 *
 * The state lives in a store rather than local component state so the results
 * screen reads the same object; closing the sheet does not lose the selection.
 */
export default function FiltersScreen() {
  const router = useRouter();
  const filters = useFilters();

  const [directorQuery, setDirectorQuery] = useState('');
  const debouncedDirector = useDebouncedValue(directorQuery, 400);

  const { data: genres = [] } = useGenres('movie');
  const { data: people = [] } = usePeopleSearch(debouncedDirector);

  const directors = useMemo(
    () =>
      people
        .filter((person) => person.known_for_department === 'Directing')
        .slice(0, 8),
    [people]
  );

  const active = filtersAreActive(filters);

  return (
    <Screen background={colors.ink} edges={['top', 'bottom']} osd={{ left: 'FILTERS', right: 'NARROW&FIND' }}>
      <View
        style={{
          paddingHorizontal: grid.screenPadding,
          paddingTop: 4,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Display variant="display">Filters</Display>

        <PressableScale
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close filters"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.inkRaised,
            borderWidth: 2,
            borderColor: colors.noir,
          }}
        >
          <Ionicons name="close" size={19} color={colors.paper} />
        </PressableScale>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: grid.screenPadding,
          paddingTop: 16,
          paddingBottom: 24,
          gap: 26,
        }}
      >
        <View style={{ gap: 12 }}>
          <Text variant="label" color={withAlpha(colors.paper, 0.55)}>Genre</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            {genres.map((genre) => (
              <Pill
                key={genre.id}
                label={genre.name}
                selected={filters.genreIds.includes(genre.id)}
                onPress={() => filters.toggleGenre(genre.id)}
              />
            ))}
          </View>
        </View>

        <FilmStrip height={9} pitch={15} />

        <View style={{ gap: 12 }}>
          <Text variant="label" color={withAlpha(colors.paper, 0.55)}>Director</Text>

          {filters.directorId !== null ? (
            <Pill
              label={`${filters.directorName}  ✕`}
              selected
              onPress={() => filters.setDirector(null, null)}
            />
          ) : (
            <>
              <SearchField
                variant="pill"
                placeholder="Search directors"
                value={directorQuery}
                onChangeText={setDirectorQuery}
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
                {directors.map((person) => (
                  <Pill
                    key={person.id}
                    label={person.name}
                    selected={false}
                    onPress={() => filters.setDirector(person.id, person.name)}
                  />
                ))}
              </View>
              {debouncedDirector.trim() && directors.length === 0 ? (
                <Text variant="bodySm" color={withAlpha(colors.paper, 0.5)}>
                  No directors match that name.
                </Text>
              ) : null}
            </>
          )}
        </View>

        <FilmStrip height={9} pitch={15} />

        <View style={{ gap: 12 }}>
          <Text variant="label" color={withAlpha(colors.paper, 0.55)}>Era</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            {DECADES.map((decade) => {
              const selected =
                filters.yearFrom === decade.from && filters.yearTo === decade.to;
              return (
                <Pill
                  key={decade.label}
                  label={decade.label}
                  selected={selected}
                  onPress={() =>
                    selected
                      ? filters.setYearRange(null, null)
                      : filters.setYearRange(decade.from, decade.to)
                  }
                />
              );
            })}
          </View>
        </View>

        <FilmStrip height={9} pitch={15} />

        <View style={{ gap: 12 }}>
          <Text variant="label" color={withAlpha(colors.paper, 0.55)}>Rating</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            {RATINGS.map((rating) => {
              const selected = filters.minRating === rating;
              return (
                <Pill
                  key={rating}
                  label={`${rating}+`}
                  selected={selected}
                  onPress={() => filters.setMinRating(selected ? null : rating)}
                />
              );
            })}
          </View>
          <Text variant="osd" color={withAlpha(colors.paper, 0.4)}>
            Rated titles are also required to have 200+ votes, so the results
            aren&apos;t obscure films with a perfect score off three ratings.
          </Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: grid.screenPadding, paddingBottom: 12, gap: 10 }}>
        <PressableScale
          onPress={() => router.push('/collection/filtered' as never)}
          scaleTo={0.975}
          accessibilityRole="button"
          accessibilityLabel="Show results"
          style={{
            backgroundColor: colors.blood,
            borderRadius: radius.md,
            borderWidth: 2,
            borderColor: colors.noir,
            paddingVertical: 18,
            alignItems: 'center',
          }}
        >
          <Text variant="label" color={colors.paper} style={{ fontSize: 13, letterSpacing: 2 }}>
            Show results
          </Text>
        </PressableScale>

        {active ? (
          <PressableScale
            onPress={filters.reset}
            scaleTo={0.975}
            accessibilityRole="button"
            accessibilityLabel="Clear all filters"
            style={{
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: withAlpha(colors.paper, 0.45),
              paddingVertical: 15,
              alignItems: 'center',
            }}
          >
            <Text variant="label" color={colors.paper}>Clear all</Text>
          </PressableScale>
        ) : null}
      </View>
    </Screen>
  );
}

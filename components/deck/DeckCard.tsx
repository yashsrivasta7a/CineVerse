import { Image } from 'expo-image';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
/**
 * Gesture Handler's Pressable, not React Native's. This card sits inside the
 * deck's `Gesture.Pan`, and the two gesture systems do not arbitrate with each
 * other: an RN Pressable can swallow the touch before the pan ever activates,
 * which on Android reads as a card that simply will not swipe.
 */
import { Pressable } from 'react-native-gesture-handler';

import { WINDOW_RADIUS } from '@/components/filmder/DeckTicket';
import { Chip } from '@/components/ui/Chip';
import { Text } from '@/components/ui/Text';
import { backdropUrlOrPlaceholder } from '@/lib/api/tmdb/images';
import type { Title } from '@/lib/api/tmdb/types';
import { useMovieDetails } from '@/lib/queries/movies';
import { useGenres } from '@/lib/queries/reference';
import { colors } from '@/theme/tokens';

export interface DeckCardProps {
  title: Title;
  /**
   * Only the top card fetches its own detail record. The chips it adds
   * (runtime, country) and the cast headshot are worth one request for the card
   * in front of the user, and not worth N for the ones behind it.
   */
  isTop?: boolean;
  onPress?: () => void;
}

const runtimeLabel = (minutes: number | null | undefined) =>
  minutes ? `${Math.floor(minutes / 60)}h ${minutes % 60}min` : null;

/**
 * TMDB returns ISO 3166-1 alpha-2. The design shows the colloquial form, which
 * is what a viewer actually recognises. Anything not listed falls through to the
 * raw code, which is still meaningful.
 */
const COUNTRY_LABEL: Record<string, string> = {
  US: 'USA', GB: 'UK', KR: 'KOREA', JP: 'JAPAN', IN: 'INDIA',
  FR: 'FRANCE', DE: 'GERMANY', IT: 'ITALY', ES: 'SPAIN', CN: 'CHINA',
  CA: 'CANADA', AU: 'AUSTRALIA', SE: 'SWEDEN', DK: 'DENMARK', MX: 'MEXICO',
  BR: 'BRAZIL', RU: 'RUSSIA', NZ: 'NEW ZEALAND', IE: 'IRELAND', NL: 'HOLLAND',
};

const countryLabel = (code: string | null | undefined) =>
  code ? (COUNTRY_LABEL[code] ?? code) : null;

/**
 * A single card in the Filmder deck: a full-bleed still inside a red frame,
 * metadata pills across the top, rating in the bottom-right corner.
 *
 * The title is deliberately absent — it sits in the fixed TitleBanner above the
 * deck, which is where the design puts it.
 */
export function DeckCard({ title, isTop = false, onPress }: DeckCardProps) {
  const { data: genres } = useGenres('movie');

  /**
   * Fetched for every mounted card, not just the top one.
   *
   * Gating this on `isTop` meant the request only started at the moment a card
   * was promoted, so its runtime and country popped into the chip row a beat
   * after the user was already looking at it. Only three cards are ever
   * mounted, and the two behind the top are the next two the user will see, so
   * this is at most two requests of genuine prefetch — and TanStack dedupes and
   * caches them, so the promotion itself costs nothing.
   */
  const { data: detail } = useMovieDetails(title.id);

  const genreName = useMemo(() => {
    if (!genres?.length || !title.genreIds.length) return null;
    const match = genres.find((genre) => genre.id === title.genreIds[0]);
    return match?.name ?? null;
  }, [genres, title.genreIds]);

  const year = title.date ? title.date.slice(0, 4) : null;
  const runtime = runtimeLabel(detail?.runtime);

  /**
   * Seeded from the list payload and upgraded when the detail record lands.
   * `useMovieDetails` only fires once a card reaches the top, so reading the
   * country from the detail alone made the whole chip row reflow one round trip
   * after every swipe.
   */
  const country =
    countryLabel(detail?.production_countries?.[0]?.iso_3166_1) ??
    countryLabel(title.originCountry?.[0]);

  return (
    <Pressable
      onPress={onPress}
      disabled={!isTop || !onPress}
      accessibilityRole="link"
      accessibilityLabel={`Open details for ${title.title}`}
      style={{
        // Matched to the ticket's window, not chosen here — see WINDOW_RADIUS.
        flex: 1,
        borderRadius: WINDOW_RADIUS,
        overflow: 'hidden',
        backgroundColor: colors.inkDeep,
      }}
    >
      <Image
        source={{
          uri: backdropUrlOrPlaceholder(
            title.backdropPath ?? title.posterPath,
            'w780'
          ),
        }}
        // Rounded here as well as clipped by the parent. The parent's
        // `overflow: 'hidden'` should be enough, but on Android that clip is an
        // outline on the ViewGroup and does not always take on a native image
        // view — rounding the still itself makes the corner independent of it.
        style={{ width: '100%', height: '100%', borderRadius: WINDOW_RADIUS }}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />

      {/* Metadata pills, centred across the top of the still. */}
      <View
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: 14,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        {country ? <Chip label={country} tone="ink" /> : null}
        {genreName ? <Chip label={genreName} tone="ink" /> : null}
        {runtime ? <Chip label={runtime} tone="ink" /> : null}
        {!runtime && year ? <Chip label={year} tone="ink" /> : null}
      </View>

      {/* Bottom-right: the score. */}
      {title.voteAverage > 0 ? (
        <View
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessible
          accessibilityLabel={`Rated ${title.voteAverage.toFixed(1)} out of 10`}
        >
          <Ionicons name="star" size={44} color={colors.paper} style={{ position: 'absolute' }} />
          <Text
            variant="label"
            color={colors.blood}
            style={{ fontSize: 13, letterSpacing: 0, fontWeight: '900', marginTop: 2 }}
          >
            {title.voteAverage.toFixed(0)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default DeckCard;

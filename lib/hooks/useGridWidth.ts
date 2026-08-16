import { useWindowDimensions } from 'react-native';

import { grid } from '@/theme/tokens';

/**
 * One grid, replacing the three that existed for the same card (48% flex-wrap
 * on home, FlatList numColumns on search, 32% flex-wrap on the watchlist).
 *
 * Returns the pixel width of a single column so cards can be sized identically
 * everywhere, and the gutter to space them with.
 */
export function useGridWidth(columns = 2, horizontalPadding = grid.screenPadding) {
  const { width } = useWindowDimensions();
  const available = width - horizontalPadding * 2 - grid.gutter * (columns - 1);

  return {
    itemWidth: Math.floor(available / columns),
    gutter: grid.gutter,
  };
}

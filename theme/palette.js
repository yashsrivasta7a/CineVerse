/**
 * Single source of colour truth for KinoRoy.
 *
 * Plain CommonJS on purpose: `tailwind.config.js` requires this directly, and
 * `theme/tokens.ts` re-exports it typed. That bridge is the whole point —
 * without it, JS-side code (SVG fills, Reanimated interpolations, tabBarStyle)
 * and `className` code drift apart, which is exactly how the previous theme
 * ended up with ~60% of its colours hardcoded past the tokens.
 */

const palette = {
  /** Primary red from the masterplan. Big flat grounds and primary actions. */
  blood: '#B53135',
  bloodDeep: '#B53135',
  bloodSoft: '#B53135',

  /** Dark brown. The app's default ground. */
  ink: '#251711',
  inkDeep: '#251711',
  inkRaised: '#251711',
  inkSoft: '#251711',

  /** Warm ivory. Type on dark, and the "paper" card surfaces. */
  paper: '#F1DAA4',
  paperDim: '#F1DAA4',
  paperDeep: '#F1DAA4',
  paperMuted: '#F1DAA4',

  noir: '#000000',
  white: '#F1DAA4',

  /** Feedback mapped to core colors to maintain strict 4-color palette */
  positive: '#D12129',
  negative: '#D12129',
};

/**
 * Semantic aliases. Components should prefer these over raw hues so a future
 * palette change is a one-file edit.
 */
const semantic = {
  bg: palette.ink,
  bgDeep: palette.inkDeep,
  surface: palette.inkRaised,
  surfacePaper: palette.paper,
  surfaceFeature: palette.blood,

  text: palette.paper,
  textDim: palette.paperDeep,
  textMuted: palette.paperMuted,
  textOnPaper: palette.ink,
  textOnBlood: palette.paper,

  border: palette.paper,
  borderStrong: palette.paper,
  borderOnPaper: palette.ink,

  shadow: palette.noir,
};

module.exports = { palette, semantic };

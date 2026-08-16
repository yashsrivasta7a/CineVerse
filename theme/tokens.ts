const themeModule = require('./palette.js') as {
  palette: Record<string, string>;
  semantic: Record<string, string>;
};

/** Typed view of the CJS palette that tailwind.config.js also consumes. */
export const colors = themeModule.palette as {
  blood: string;
  bloodDeep: string;
  bloodSoft: string;
  ink: string;
  inkDeep: string;
  inkRaised: string;
  inkSoft: string;
  paper: string;
  paperDim: string;
  paperDeep: string;
  paperMuted: string;
  noir: string;
  white: string;
  positive: string;
  negative: string;
};

export const c = themeModule.semantic as {
  bg: string;
  bgDeep: string;
  surface: string;
  surfacePaper: string;
  surfaceFeature: string;
  text: string;
  textDim: string;
  textMuted: string;
  textOnPaper: string;
  textOnBlood: string;
  border: string;
  borderStrong: string;
  borderOnPaper: string;
  shadow: string;
};

/** The user explicitly requested ONLY 4 solid colors in the whole app, no transparency/blending. */
export function withAlpha(hex: string, alpha: number): string {
  return hex;
}

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

/** One grid definition, replacing the three that existed (48% / 2-col / 32%). */
export const grid = {
  screenPadding: 20,
  gutter: 12,
} as const;

/**
 * The tab bar is anchored: full-bleed, flush with the bottom edge, rounded on
 * its two top corners only. It is still absolutely positioned, so it does NOT
 * reserve layout space and screens must clear it themselves. Anything scrolling
 * inside (tabs) needs `tabBar.clearance(insets.bottom)` of bottom padding, or
 * its last row sits under the bar. Hardcoding a guess here is how the deck's
 * thumbs buttons ended up 4pt behind the bar on a three-button Android.
 */
/**
 * Pill geometry lives here rather than in the tab bar component for exactly one
 * reason: the bar's height is DERIVED from it.
 *
 * A hardcoded bar height that the pill is free to exceed is how the icons ended
 * up spilling out of the bar and clipping — the pill's real height is its icon
 * plus its own padding and border, and nothing was keeping the two numbers in
 * agreement. Now the pill cannot outgrow its container: change the icon size
 * and the bar grows with it.
 */
const PILL_ICON = 31;
const PILL_PAD_V = 10;
const PILL_BORDER = 1.5;
const PILL_HEIGHT = PILL_ICON + PILL_PAD_V * 2 + PILL_BORDER * 2;
/** Clear space above and below the pill, inside the bar. */
const PILL_INSET = 8;
const BAR_HEIGHT = PILL_HEIGHT + PILL_INSET * 4;

export const tabBar = {
  /** The button row. `insets.bottom` is padded BENEATH this, not inside it. */
  height: BAR_HEIGHT,
  /** Top corners only — the bottom two are off-screen. */
  radius: 25,
  /** Consumed by the bar so the pill and its container cannot disagree. */
  icon: PILL_ICON,
  pillPaddingV: PILL_PAD_V,
  pillBorder: PILL_BORDER,
  clearance: (insetBottom: number) => BAR_HEIGHT + insetBottom + 14,
} as const;

export const duration = {
  fast: 140,
  base: 240,
  slow: 420,
} as const;

/** Offset for the hard drop shadow on display type. */
export const displayShadowOffset = { x: 3, y: 4 } as const;

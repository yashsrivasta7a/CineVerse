import { Platform, type TextStyle } from 'react-native';

/**
 * Typography lives here as React Native style objects rather than Tailwind
 * `font-*` classes, for one specific reason: React Native does not synthesize
 * font weights, and Android silently ignores `fontWeight` when a custom
 * `fontFamily` is set. Pairing a family with a weight is therefore a bug that
 * only shows on one platform. Routing all type through a variant map makes that
 * combination unrepresentable.
 */

/**
 * Availability is per family, not global — Thunder is supplied, the other two
 * are not yet. Each family falls back independently, so the ones that are
 * present render for real while the rest sit on system faces.
 *
 * TO ADD THE REMAINING TWO:
 *   1. Drop into assets/fonts/ (both free, SIL OFL):
 *        InterTight-{Regular,Medium,SemiBold,Bold}.ttf
 *          https://fonts.google.com/specimen/Inter+Tight
 *        HomemadeApple-Regular.ttf
 *          https://fonts.google.com/specimen/Homemade+Apple
 *   2. Flip the flags below.
 *   3. Add the filenames to the expo-font plugin block in app.json.
 *   4. Rebuild: npx expo run:android
 */
export const FONTS = {
  /**
   * Licensed Thunder (Pangram Pangram). Three cuts are embedded from the full
   * family: Black LC + Black HC (900, the poster face) and Bold LC (700).
   * The TrueType flavour is used rather than the OpenType-PS `.otf`s — Android
   * is markedly more reliable with TTF outlines.
   */
  thunder: true,
  interTight: false,
  homemadeApple: false,
} as const;

const SYSTEM = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

const SYSTEM_CONDENSED = Platform.select({
  ios: 'System',
  android: 'sans-serif-condensed',
  default: 'System',
});

/**
 * Thunder cuts are referenced by their full PostScript name, and the files in
 * assets/fonts/ are named identically. That matters: the expo-font config
 * plugin registers by filename on Android and by PostScript name on iOS, so
 * keeping the two identical means one string works on both platforms.
 * Do not rename these files.
 *
 * Referencing by *family* name would not work — each weight declares its own
 * family ("Thunder Black", "Thunder SemBd", …) and several share the plain
 * "Thunder" family, so they would collide.
 *
 * Weight is baked into the file (Black = 900), which is why no `fontWeight` is
 * emitted alongside it — see `w()` below.
 *
 * Only ONE Black cut is embedded. Thunder-BlackLC and Thunder-BlackHC both
 * declare the family name "Thunder Black", and iOS will happily resolve a
 * family name — so shipping both risks iOS picking the HC cut while Android,
 * which resolves by filename, picks LC. Same app, two different faces, silently.
 *
 * To try the HC design instead: copy Thunder-BlackHC.ttf out of your local
 * Thunder licence drop into assets/fonts/, remove BlackLC, and update this name
 * plus app.json and the useFonts map. Swap them — never embed both. Their
 * vertical metrics are identical (cap height 70% of em in each), so nothing
 * reflows.
 *
 * The full family is deliberately NOT in this repo. It is licensed commercial
 * software; only the two cuts the app actually ships are committed, and the
 * source drop is gitignored.
 */
export const fontFamily = {
  display: FONTS.thunder ? 'Thunder-BlackLC' : SYSTEM_CONDENSED,
  displayAlt: FONTS.thunder ? 'Thunder-BoldLC' : SYSTEM_CONDENSED,
  body: FONTS.interTight ? 'InterTight-Regular' : SYSTEM,
  medium: FONTS.interTight ? 'InterTight-Medium' : SYSTEM,
  semibold: FONTS.interTight ? 'InterTight-SemiBold' : SYSTEM,
  bold: FONTS.interTight ? 'InterTight-Bold' : SYSTEM,
  script: FONTS.homemadeApple ? 'HomemadeApple-Regular' : SYSTEM,
} as const;

/**
 * With one file per family there is nothing for a weight to select, so a weight
 * is only emitted for families still on a system fallback — where it is doing
 * the work the real face would otherwise do.
 */
const w = (
  weight: TextStyle['fontWeight'],
  hasRealFace: boolean
): TextStyle['fontWeight'] => (hasRealFace ? undefined : weight);

/**
 * Thunder is already ultra-condensed, so it needs far less negative tracking
 * than a normal grotesque would.
 *
 * Line height stays just under 1.0 for the stacked-poster look, but NOT below
 * about 0.92 — anything tighter and wrapped display text collides with the line
 * above it. Single-line headings look fine at 0.86; the moment a title wraps,
 * it reads as broken.
 */
const displayLine = (size: number) => Math.round(size * 0.94);

export type TypeVariant =
  | 'displayXl'
  | 'display'
  | 'displaySm'
  | 'displayXs'
  | 'title'
  | 'heading'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'chip'
  | 'script'
  | 'osd';

export const typography: Record<TypeVariant, TextStyle> = {
  /** Poster-scale wordmarks. */
  displayXl: {
    fontFamily: fontFamily.display,
    fontWeight: w('900', FONTS.thunder),
    fontSize: 60,
    lineHeight: displayLine(60),
    letterSpacing: FONTS.thunder ? -0.5 : -2,
    textTransform: 'uppercase',
  },
  display: {
    fontFamily: fontFamily.display,
    fontWeight: w('900', FONTS.thunder),
    fontSize: 42,
    lineHeight: displayLine(42),
    letterSpacing: FONTS.thunder ? -0.4 : -1.4,
    textTransform: 'uppercase',
  },
  displaySm: {
    fontFamily: fontFamily.display,
    fontWeight: w('900', FONTS.thunder),
    fontSize: 28,
    lineHeight: displayLine(28),
    letterSpacing: FONTS.thunder ? -0.2 : -0.7,
    textTransform: 'uppercase',
  },
  displayXs: {
    fontFamily: fontFamily.display,
    fontWeight: w('900', FONTS.thunder),
    fontSize: 19,
    lineHeight: displayLine(19),
    letterSpacing: FONTS.thunder ? 0 : -0.3,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamily.bold,
    fontWeight: w('800', FONTS.interTight),
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  heading: {
    fontFamily: fontFamily.semibold,
    fontWeight: w('700', FONTS.interTight),
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: fontFamily.body,
    fontWeight: w('400', FONTS.interTight),
    fontSize: 14.5,
    lineHeight: 21,
  },
  bodySm: {
    fontFamily: fontFamily.body,
    fontWeight: w('400', FONTS.interTight),
    fontSize: 12.5,
    lineHeight: 18,
  },
  /** Uppercase micro-labels. */
  label: {
    fontFamily: fontFamily.semibold,
    fontWeight: w('700', FONTS.interTight),
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  chip: {
    fontFamily: fontFamily.medium,
    fontWeight: w('600', FONTS.interTight),
    fontSize: 11.5,
    lineHeight: 15,
    letterSpacing: 0.2,
  },
  /** Handwritten captions on polaroids and dates. */
  script: {
    fontFamily: fontFamily.script,
    fontWeight: w('400', FONTS.homemadeApple),
    fontStyle: FONTS.homemadeApple ? 'normal' : 'italic',
    fontSize: 14,
    lineHeight: 20,
  },
  /** VCR on-screen-display chrome — [PLAY], ●REC 00:13:24. */
  osd: {
    fontFamily: fontFamily.semibold,
    fontWeight: w('700', FONTS.interTight),
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
};

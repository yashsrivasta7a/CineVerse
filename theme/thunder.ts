/**
 * Metrics for Thunder-BlackLC, read out of the shipped TTF rather than guessed.
 *
 *   unitsPerEm  1000
 *   capHeight   700   (OS/2) — 0.70em, matching the note in typography.ts
 *   hhea        720 / -200 / 0, i.e. a 0.92em line box
 *   mean A–Z advance 0.3704em
 *
 * These exist for ONE job: sizing the Filmder marquee so the title fills its
 * panel edge to edge, the way the design does it. Stepping the display scale by
 * character count — the obvious approach, and what shipped first — leaves the
 * type stranded in the middle of the panel: "IINVASHIONN" measures 3.684em, so
 * at the 42pt `display` cut it covers 155 of 318 available dp, under half the
 * width. A short title is worse; "DUNE" is 1.44em and covers 27%.
 *
 * React Native cannot measure text synchronously during layout, so the only way
 * to size type to a known box in one pass is to carry the advance widths.
 */

/** OS/2 capHeight ÷ unitsPerEm. All-caps, so this is the visible height. */
export const THUNDER_CAP = 0.7;

/**
 * The font's own line box, (hhea ascender - descender) ÷ unitsPerEm — 720 and
 * -200, so 0.92em. `lineHeight` must not go below this. See `fitThunder`.
 */
export const THUNDER_LINE = 0.92;

/** Tracking, in em. Increased to prevent letters from merging when block shadow is applied. */
export const THUNDER_TRACK = 0.0;

/**
 * Advance widths in em. Only the glyphs a film title realistically uses; the
 * A–Z mean covers everything else, which is accurate to a few percent and is
 * only ever used to pick a font size that then gets clamped anyway.
 */
const ADVANCE: Record<string, number> = {
  A: 0.378, B: 0.392, C: 0.384, D: 0.384, E: 0.272, F: 0.268, G: 0.384,
  H: 0.384, I: 0.192, J: 0.384, K: 0.391, L: 0.269, M: 0.482, N: 0.4,
  O: 0.384, P: 0.384, Q: 0.384, R: 0.384, S: 0.384, T: 0.368, U: 0.384,
  V: 0.378, W: 0.506, X: 0.394, Y: 0.378, Z: 0.338,
  '0': 0.384, '1': 0.234, '2': 0.385, '3': 0.384, '4': 0.384, '5': 0.384,
  '6': 0.384, '7': 0.338, '8': 0.384, '9': 0.384,
  ' ': 0.16, '.': 0.184, ',': 0.184, ':': 0.184, '-': 0.252, "'": 0.143,
  '!': 0.192, '?': 0.385, '&': 0.414, '(': 0.23, ')': 0.23, '/': 0.26,
};

const FALLBACK = 0.3704;

/** Natural width of `text` in em, tracking included. */
export function advanceEm(text: string): number {
  let sum = 0;
  for (const ch of text) sum += ADVANCE[ch] ?? FALLBACK;
  return sum + THUNDER_TRACK * Math.max(text.length - 1, 0);
}

export interface ThunderFit {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

/**
 * Largest size whose natural width fits `usable`, clamped both ways.
 *
 * The lower clamp stops a very long title shrinking into illegibility — it wraps
 * or truncates instead, which is the better failure. The upper clamp stops a
 * one-word title from swallowing the screen.
 *
 * `lineHeight` is the font's full line box and must stay there. A tighter value
 * does not crop the empty descender space, it crops the CAPS — Android's
 * CustomLineHeightSpan honours the requested height by keeping the descent and
 * squeezing the ascent, so a lineHeight of L em leaves only (L - 0.20)em above
 * the baseline. Thunder's caps are 0.70em tall, so anything under 0.90em shaves
 * the tops of the letters off; the 0.84em this used to ask for cut 0.06em, which
 * at the marquee's 92pt cap is a visible 5-6px slice across the whole title.
 */
export function fitThunder(
  text: string,
  usable: number,
  maxSize: number
): ThunderFit {
  const em = Math.max(advanceEm(text), 0.5);
  const fontSize = Math.min(Math.max(usable / em, 26), maxSize);

  return {
    fontSize,
    lineHeight: Math.ceil(fontSize * THUNDER_LINE),
    // Must match THUNDER_TRACK, or the measured width and the rendered width
    // disagree and the fit is wrong by a few percent per character.
    letterSpacing: fontSize * THUNDER_TRACK,
  };
}

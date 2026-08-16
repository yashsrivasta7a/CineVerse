/**
 * ISO 3166-1 alpha-2 -> flag emoji, via regional indicator symbols.
 *
 * No image assets needed. Note that a handful of older Android builds render
 * regional indicators as two letter boxes rather than a flag — the country name
 * always sits beside the glyph, so the chip stays readable either way.
 */
export function flagEmoji(iso: string): string {
  const code = iso.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return '';

  return String.fromCodePoint(
    ...[...code].map((char) => 127397 + char.charCodeAt(0))
  );
}

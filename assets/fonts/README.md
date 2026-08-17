# Fonts

## Thunder — installed ✅

The licensed Pangram Pangram **Thunder** family is wired up and embedded natively.

Three cuts are shipped out of the full family (which has Thin→Black, HC and LC
designs, plus italics — 74 files in total, far more than an app needs):

| File | Weight | Used for |
|---|---|---|
| `Thunder-BlackLC.ttf` | 900 | all `display*` variants — the poster type |
| `Thunder-BoldLC.ttf` | 700 | `fontFamily.displayAlt` |

**Exactly one Black cut, deliberately.** `Thunder-BlackLC` and `Thunder-BlackHC`
both declare the family name `Thunder Black`. iOS will resolve a *family* name
happily, so embedding both risks iOS picking HC while Android — which resolves
by filename — picks LC: the same build rendering two different faces, silently.
To try the HC design, copy it in from your local Thunder licence drop and remove
BlackLC. Swap them; never ship both. Their vertical metrics are identical (cap
height 70% of the em in each), so nothing reflows.

**Only these two cuts are committed.** Thunder is licensed commercial software —
the full family is gitignored and must not be pushed to a public repo.

**TrueType, not OpenType-PS.** The family ships both; Android is markedly more
reliable with TTF outlines than with CFF/PostScript `.otf`, so the `.ttf`
flavour is the one embedded.

### Rules that must not be broken

**Reference cuts by PostScript name, never by family name.** Each weight
declares its own family — `Thunder Black`, `Thunder SemBd`, `Thunder Med` — and
several cuts share the plain `Thunder` family. Referencing by family would
collide. The filenames here are deliberately identical to the PostScript names,
because the expo-font config plugin registers by *filename* on Android and by
*PostScript name* on iOS — keeping them the same means one string works on both.
**Do not rename these files.**

**Never pair a Thunder family with `fontWeight`.** The weight is baked into the
file. React Native does not synthesize weights, and Android silently drops (or
mis-renders) `fontWeight` on a custom `fontFamily`. `theme/typography.ts`
enforces this: the `w()` helper only emits a weight for families still on a
system fallback.

### HC vs LC

Two designs of the same weight. Their vertical metrics are identical — cap
height is 70% of the em in both, `hhea` ascent+descent is 0.92em — so they are
interchangeable for the all-caps display usage here, and the `displayLine`
multiplier (0.94) clears the line box either way. If HC reads closer to the
masterplan, change one line in `theme/typography.ts`:

```ts
display: FONTS.thunder ? 'Thunder-BlackHC' : SYSTEM_CONDENSED,
```

---

## Inter Tight — not yet supplied

In the masterplan, Thunder is used **only** for the big headings. Subtitles,
chip labels, tile labels and button text are all a normal-width grotesque —
that's **Inter Tight**, and it is the family still missing. Those styles
currently fall back to the platform's system face at the right weights, so
rhythm and hierarchy are correct and only the letterforms differ.

To add it:

1. Download from https://fonts.google.com/specimen/Inter+Tight — use the
   `static/` folder inside the zip, and place these here:
   `InterTight-Regular.ttf`, `InterTight-Medium.ttf`,
   `InterTight-SemiBold.ttf`, `InterTight-Bold.ttf`
2. Add those four paths to the `expo-font` plugin block in `app.json`.
3. In `theme/typography.ts`, set `interTight: true`.
4. Rebuild.

`Homemade Apple` (the handwritten accents) is optional and follows the same
pattern via the `homemadeApple` flag.

---

## Rebuilding

Fonts are embedded at **build** time by the expo-font config plugin, so a Metro
reload will never pick up a font change:

```
npx expo prebuild --clean
npx expo run:android
```

`--clean` is safe here — `android/` is generated and gitignored.

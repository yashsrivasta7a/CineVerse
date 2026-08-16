const { palette, semantic } = require('./theme/palette.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Raw hues.
        blood: palette.blood,
        'blood-deep': palette.bloodDeep,
        'blood-soft': palette.bloodSoft,
        ink: palette.ink,
        'ink-deep': palette.inkDeep,
        'ink-raised': palette.inkRaised,
        'ink-soft': palette.inkSoft,
        paper: palette.paper,
        'paper-dim': palette.paperDim,
        'paper-deep': palette.paperDeep,
        'paper-muted': palette.paperMuted,
        noir: palette.noir,
        positive: palette.positive,
        negative: palette.negative,

        // Semantic aliases — prefer these in components.
        bg: semantic.bg,
        surface: semantic.surface,
        feature: semantic.surfaceFeature,
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};

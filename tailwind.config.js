/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#000000",
        secondary: "#121212",
        light: {
          100: "#FFFFFF",
          200: "#E0E0E0",
          300: "#9E9E9E",
        },
        dark: {
          100: "#1E1E1E",
          200: "#0A0A0A",
        },
        accent: "#FF4500",
      },
    },
  },
  plugins: [],
};
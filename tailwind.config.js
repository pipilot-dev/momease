/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#F9A8D4",
          50: "#FFF5F9",
          100: "#FDE5EC",
          200: "#FBC8DC",
          300: "#F9A8D4",
          400: "#F472B6",
          500: "#EC4899",
          600: "#DB2777",
        },
        secondary: {
          DEFAULT: "#A7F3D0",
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
        },
        accent: {
          DEFAULT: "#C4B5FD",
          50: "#F5F3FF",
          100: "#EDE9FE",
          200: "#DDD6FE",
          300: "#C4B5FD",
          400: "#A78BFA",
          500: "#8B5CF6",
        },
        surface: "#FFFFFF",
        bg: "#FDFCFB",
        warm: {
          50: "#FDF2F8",
          100: "#FDE5EC",
        },
      },
      fontFamily: {
        quicksand: ["Quicksand"],
        "quicksand-bold": ["Quicksand-Bold"],
        "quicksand-medium": ["Quicksand-Medium"],
        "quicksand-semibold": ["Quicksand-SemiBold"],
      },
      borderRadius: {
        card: "12px",
        modal: "16px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};

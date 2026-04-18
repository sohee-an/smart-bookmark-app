import type { Config } from "tailwindcss";

export default {
  content: ["./entrypoints/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      keyframes: {
        "loading-bar": {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(200%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      animation: {
        "loading-bar": "loading-bar 2s ease-in-out infinite",
      },
      colors: {
        brand: {
          primary: "#4f46e5",
          hover: "#4338ca",
          active: "#3730a3",
        },
        surface: {
          base: "#fafafa",
          card: "#ffffff",
          "base-dark": "#09090b",
          "card-dark": "#18181b",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;

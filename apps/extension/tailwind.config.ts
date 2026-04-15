import type { Config } from "tailwindcss";

export default {
  content: ["./entrypoints/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
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

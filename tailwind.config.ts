import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#050505",
        charcoal: "#0D0D0D",
        gold: "#D4AF37",
        champagne: "#E8C76A",
        pearl: "#F5F5F5",
        silver: "#B3B3B3",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["Inter", "Arial", "sans-serif"],
      },
      boxShadow: {
        gold: "0 0 0 1px rgba(212,175,55,.45), 0 24px 70px rgba(212,175,55,.12)",
      },
      backgroundImage: {
        "gold-gradient":
          "linear-gradient(110deg, #b88a22 0%, #f4d879 48%, #b98a24 100%)",
      },
    },
  },
  plugins: [],
};

export default config;

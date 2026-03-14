import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "#0d6efd",
          foreground: "#f8fbff",
        },
        accent: {
          DEFAULT: "#14b8a6",
          foreground: "#f4fffd",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"],
        serif: ["var(--font-merriweather)", "serif"],
      },
      boxShadow: {
        soft: "0 24px 60px rgba(15, 23, 42, 0.08)",
        card: "0 20px 45px rgba(13, 110, 253, 0.08)",
        glow: "0 0 0 1px rgba(255,255,255,0.55), 0 20px 50px rgba(20, 184, 166, 0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.45s ease-out both",
        float: "float 10s ease-in-out infinite",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;


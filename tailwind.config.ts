import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        surface: "#141414",
        elevated: "#1f1f1f",
        accent: "#f59e0b",
        "accent-dim": "#b45309",
        danger: "#ef4444",
        border: "#27272a",
        "text-primary": "#fafafa",
        "text-secondary": "#a1a1aa",
        "text-muted": "#52525b",
      },
      fontFamily: {
        sans: ["Syne", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "accent-glow": "0 4px 20px rgba(245, 158, 11, 0.2)",
      },
    },
  },
  plugins: [],
};

export default config;

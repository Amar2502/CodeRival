import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        card: "var(--card)",

        foreground: "var(--foreground)",
        muted: "var(--muted)",

        border: "var(--border)",

        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          foreground: "var(--primary-foreground)",
        },

        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",

        easy: "var(--easy)",
        medium: "var(--medium)",
        hard: "var(--hard)",

        rating: {
          gray: "var(--rating-gray)",
          blue: "var(--rating-blue)",
          purple: "var(--rating-purple)",
          orange: "var(--rating-orange)",
          gold: "var(--rating-gold)",
        },
      },

      borderRadius: {
        lg: "var(--radius)",
      },
    },
  },
} satisfies Config;
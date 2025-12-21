import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary - Deep Teal
        primary: {
          DEFAULT: "#0F766E",
          hover: "#0D645D",
          light: "#14B8A6",
        },
        // Secondary - Warm Coral
        secondary: {
          DEFAULT: "#F97360",
          hover: "#E86350",
          light: "#FECACA",
        },
        // Accent - Lilac Tint
        accent: {
          DEFAULT: "#F3EFFF",
          dark: "#E9E3FF",
        },
        // Neutrals
        ink: "#111827",
        paper: "#FFFFFF",
        gray: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
        },
        // States
        error: "#EF4444",
        success: "#10B981",
      },
      fontFamily: {
        serif: ["Lora", "serif"],
        sans: ['"Plus Jakarta Sans"', "sans-serif"],
      },
      fontSize: {
        display: ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        h1: ["2rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        h2: ["1.5rem", { lineHeight: "1.3" }],
        h3: ["1.25rem", { lineHeight: "1.4" }],
        body: ["1rem", { lineHeight: "1.5" }],
        small: ["0.875rem", { lineHeight: "1.5" }],
        button: ["1rem", { lineHeight: "1", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "16px",
        xl: "24px",
        card: "16px",
        button: "24px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0,0,0,0.05)",
        md: "0 4px 6px -1px rgba(0,0,0,0.1)",
        pop: "4px 4px 0px 0px #111827",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
      },
      aspectRatio: {
        a4: "1 / 1.41",
      },
    },
  },
  plugins: [],
};

export default config;

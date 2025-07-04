import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Google-inspired colors
        google: {
          blue: "#4285F4",
          red: "#EA4335",
          yellow: "#FBBC04",
          green: "#34A853",
          gray: "#5F6368",
          lightGray: "#F8F9FA",
        },
        // Semantic colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "#4285F4", // Google Blue
          foreground: "#FFFFFF",
          50: "#E8F0FE",
          100: "#D2E3FC",
          200: "#AECBFA",
          300: "#8AB4F8",
          400: "#669DF6",
          500: "#4285F4",
          600: "#1A73E8",
          700: "#1967D2",
          800: "#185ABC",
          900: "#174EA6",
        },
        secondary: {
          DEFAULT: "#34A853", // Google Green
          foreground: "#FFFFFF",
          50: "#E6F4EA",
          100: "#CEEAD6",
          200: "#A8DAB5",
          300: "#81C995",
          400: "#5BB974",
          500: "#34A853",
          600: "#2D9248",
          700: "#267C3D",
          800: "#1F6632",
          900: "#185026",
        },
        accent: {
          DEFAULT: "#FBBC04", // Google Yellow
          foreground: "#202124",
          50: "#FEF7E0",
          100: "#FEEFC3",
          200: "#FDE293",
          300: "#FDD663",
          400: "#FCC934",
          500: "#FBBC04",
          600: "#F9AB00",
          700: "#F29900",
          800: "#EA8600",
          900: "#E37400",
        },
        danger: {
          DEFAULT: "#EA4335", // Google Red
          foreground: "#FFFFFF",
          50: "#FCE8E6",
          100: "#FAD2CF",
          200: "#F5AEA7",
          300: "#F18B7F",
          400: "#EC6757",
          500: "#EA4335",
          600: "#D33B2C",
          700: "#BB3326",
          800: "#A42B1F",
          900: "#8C2318",
        },
        destructive: {
          DEFAULT: "#EA4335",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
        full: "9999px",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "-apple-system", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        display: ["Google Sans", "var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        xxs: ["10px", "14px"],
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "bounce-in": "bounce-in 0.5s ease-out",
        "pulse-scale": "pulse-scale 2s ease-in-out infinite",
        ripple: "ripple 0.6s ease-out",
        shimmer: "shimmer 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          from: { transform: "translateY(-100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" },
        },
        "bounce-in": {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "70%": { transform: "scale(0.9)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "pulse-scale": {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "1" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      boxShadow: {
        google: "0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)",
        "google-hover": "0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)",
        "google-pressed": "0 1px 1px 0 rgba(60,64,67,0.3), 0 1px 2px 0 rgba(60,64,67,0.15)",
        soft: "0 2px 8px rgba(0,0,0,0.08)",
        medium: "0 4px 16px rgba(0,0,0,0.12)",
        large: "0 8px 32px rgba(0,0,0,0.16)",
      },
      backgroundImage: {
        "google-gradient": "linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC04 100%)",
        "shimmer-gradient": "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;

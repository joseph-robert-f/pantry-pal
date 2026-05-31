import type { Config } from "tailwindcss";

// Design system tokens — spec §2. Use semantic names in components, never raw
// hex. The typography scale and spacing discipline below are intentionally
// constrained so the prototype ports cleanly to NativeWind later.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm neutrals
        cream: "#FAF7F2", // background
        card: "#FFFFFF", // surface
        ink: "#1F1B16", // primary text
        muted: "#6B6259", // secondary text
        subtle: "#E8DFD3", // soft border / fill
        hairline: "#D9CFC0", // 1px borders

        // Accents
        terracotta: {
          DEFAULT: "#C56E47",
          soft: "#F4E2D7",
          deep: "#7A3617", // text on terracotta-soft
        },
        sage: {
          DEFAULT: "#7A8B6F",
          soft: "#DDE5D6",
          deep: "#3F5036", // text on sage-soft
        },
        tan: {
          DEFAULT: "#C8A668",
          soft: "#F1E5C7",
          deep: "#6B5219",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "Georgia", "serif"],
      },
      fontSize: {
        // Use these only. No arbitrary sizes.
        xs: ["11px", { lineHeight: "1.4" }],
        sm: ["13px", { lineHeight: "1.5" }],
        base: ["15px", { lineHeight: "1.55" }],
        lg: ["18px", { lineHeight: "1.4" }],
        xl: ["22px", { lineHeight: "1.3" }],
        "2xl": ["28px", { lineHeight: "1.2" }],
      },
      borderRadius: {
        md: "6px",
        lg: "10px",
        "2xl": "16px",
      },
      maxWidth: {
        frame: "390px",
      },
    },
  },
  plugins: [],
};

export default config;

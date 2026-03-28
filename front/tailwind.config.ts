import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#ffffff",
        app: "#0a0a0b",
        card: "#16161a",
        accent: "#7c3aed",
        action: "#3b82f6",
        success: "#22c55e",
        muted: "#a1a1aa"
      },
      fontFamily: {
        display: ["Inter", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        body: ["Inter", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"]
      },
      boxShadow: {
        soft: "0 30px 80px rgba(0, 0, 0, 0.35)"
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top left, rgba(124, 58, 237, 0.22), transparent 32%), radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.16), transparent 28%)"
      }
    }
  },
  plugins: []
};

export default config;

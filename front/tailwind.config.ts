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
        ink: "#171410",
        sand: "#f4efe5",
        dune: "#d5c8b8",
        ember: "#c65b2a",
        pine: "#28503f",
        mist: "#edf5f2"
      },
      fontFamily: {
        display: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
        body: ["Avenir Next", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"]
      },
      boxShadow: {
        soft: "0 20px 60px rgba(29, 23, 17, 0.08)"
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top left, rgba(233, 192, 146, 0.7), transparent 38%), radial-gradient(circle at bottom right, rgba(99, 153, 122, 0.18), transparent 28%)"
      }
    }
  },
  plugins: []
};

export default config;

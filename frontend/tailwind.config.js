/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // refined indigo accent, full ramp
        accent: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",   // default
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          DEFAULT: "#4f46e5",
          soft: "#eef2ff",
          hover: "#4338ca",
        },
        // warm neutral page bg layered over zinc
        cream: {
          50:  "#fafaf7",
          100: "#f5f4ee",
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        // softer, layered shadows
        card: "0 1px 2px 0 rgba(20, 22, 30, 0.04), 0 1px 3px 0 rgba(20, 22, 30, 0.04)",
        cardHover: "0 4px 12px -2px rgba(20, 22, 30, 0.08), 0 2px 4px -2px rgba(20, 22, 30, 0.04)",
        feature: "0 4px 20px -6px rgba(79, 70, 229, 0.08), 0 1px 3px 0 rgba(20, 22, 30, 0.05)",
        pop: "0 18px 40px -10px rgba(20, 22, 30, 0.22), 0 6px 14px -6px rgba(20, 22, 30, 0.08)",
        // inner highlight used on primary button
        innerTop: "inset 0 1px 0 0 rgba(255, 255, 255, 0.18)",
      },
      backgroundImage: {
        // primary button gradient
        "accent-grad": "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)",
        // hero halo
        "hero-halo": "radial-gradient(1200px 280px at 5% 0%, rgba(99, 102, 241, 0.10), transparent 60%)",
        // subtle feature card lift
        "feature-tint": "linear-gradient(180deg, #ffffff 0%, #fafaf7 100%)",
      },
      animation: {
        "fade-in": "fadeIn 150ms ease-out",
        "pop-in": "popIn 180ms cubic-bezier(0.18, 0.9, 0.32, 1.2)",
        "pulse-dot": "pulseDot 1.8s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        popIn: {
          from: { opacity: 0, transform: "translateY(6px) scale(0.985)" },
          to: { opacity: 1, transform: "translateY(0) scale(1)" },
        },
        pulseDot: {
          "0%, 100%": { opacity: 1, transform: "scale(1)" },
          "50%": { opacity: 0.55, transform: "scale(0.85)" },
        },
      },
    },
  },
  plugins: [],
};

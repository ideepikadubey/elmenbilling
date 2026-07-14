/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        elmen: {
          // White, Grey, and Blue theme palette
          black: '#F8FAFC',         // page background (light slate/white)
          charcoal: '#FFFFFF',      // card background (white)
          dark: '#F1F5F9',          // subtle section bg (light grey)
          gray: '#E2E8F0',          // borders / dividers
          lightgray: '#F8FAFC',     // input backgrounds
          text: '#0F172A',          // primary text (deep slate)
          muted: '#64748B',         // muted/secondary text
          orange: '#2563EB',        // brand accent (Royal Blue)
          'orange-hover': '#1D4ED8',
          'orange-light': 'rgba(37, 99, 235, 0.08)',
          'orange-glow': 'rgba(37, 99, 235, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'premium-glass': '0 4px 20px 0 rgba(15, 23, 42, 0.05)',
        'premium-glow': '0 0 15px 0 rgba(37, 99, 235, 0.12)',
        'premium-inset': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.8)',
        'card': '0 1px 3px 0 rgba(15,23,42,0.04), 0 4px 12px 0 rgba(15,23,42,0.03)',
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
}

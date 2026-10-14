/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          // Obsidian Navy Backgrounds
          darkest: '#080F1D',
          dark: '#0B1424',

          // Slate Blue Surfaces
          surface: '#111D30',
          elevated: '#16253D',
          subtle: '#0E1726',

          // Enterprise Borders
          border: '#1E314F',
          borderHover: 'rgba(69, 200, 232, 0.3)',
          borderFocus: '#45C8E8',

          // Primary Accents
          accent: '#45C8E8',
          accentHover: '#38B2D0',
          accentMuted: 'rgba(69, 200, 232, 0.12)',

          // AI / ML Epistemic Accents
          ai: '#9B8AFB',
          aiHover: '#8875F0',
          aiMuted: 'rgba(155, 138, 251, 0.12)',

          // Severity & Status (Restrained, meaningful states only)
          rose: '#EF4444',     // Critical
          orange: '#F97316',   // High
          amber: '#F59E0B',    // Medium / Warning
          emerald: '#10B981',  // Low / Allowlisted / Optimal

          // Typography
          textMain: '#F8FAFC',
          textMuted: '#8EA2C6',
          textSubtle: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        panel: '0 4px 20px -2px rgba(0, 0, 0, 0.35)',
        card: '0 2px 10px -1px rgba(0, 0, 0, 0.25)',
        dropdown: '0 10px 30px -5px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}

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
          darkest: '#080c14',
          dark: '#0e1422',
          surface: '#151d30',
          border: '#222f4c',
          accent: '#00f0ff',
          accentHover: '#00c8d7',
          blue: '#3b82f6',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          textMuted: '#8295b3',
          textMain: '#f1f5f9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -3px rgba(0, 240, 255, 0.18)',
        glowEmerald: '0 0 20px -3px rgba(16, 185, 129, 0.2)',
        glowRose: '0 0 20px -3px rgba(244, 63, 94, 0.25)',
      }
    },
  },
  plugins: [],
}

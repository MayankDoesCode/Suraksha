/** @type {import('tailwindcss').Config} */
// Colours are semantic tokens backed by CSS variables (see src/index.css), so every
// component follows the active light/dark theme and opacity modifiers (bg-accent/20) still work.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

const semantic = {
  canvas: token('canvas'),           // app background
  surface: token('surface'),         // cards, panels
  surface2: token('surface-2'),      // inset areas, inputs
  surface3: token('surface-3'),      // hover, elevated
  line: token('line'),               // borders, dividers
  fg: token('fg'),                   // primary text
  fgMuted: token('fg-muted'),        // secondary text
  fgSubtle: token('fg-subtle'),      // tertiary text
  accent: token('accent'),           // primary actions
  accentHover: token('accent-hover'),
  onAccent: token('on-accent'),      // text on a solid accent fill
  ai: token('ai'),                   // AI / ML-derived content
  ok: token('ok'),                   // confirmed safe / low
  warn: token('warn'),               // warning / medium
  high: token('high'),               // high severity
  danger: token('danger'),           // critical / destructive
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ...semantic,
        // Legacy names used across existing views, mapped onto the same tokens.
        cyber: {
          darkest: semantic.canvas,
          dark: semantic.canvas,
          surface: semantic.surface,
          elevated: semantic.surface3,
          subtle: semantic.surface2,
          border: semantic.line,
          borderHover: semantic.accent,
          borderFocus: semantic.accent,
          accent: semantic.accent,
          accentHover: semantic.accentHover,
          accentMuted: token('accent'),
          ai: semantic.ai,
          aiHover: semantic.ai,
          aiMuted: semantic.ai,
          rose: semantic.danger,
          critical: semantic.danger,
          orange: semantic.high,
          high: semantic.high,
          amber: semantic.warn,
          medium: semantic.warn,
          emerald: semantic.ok,
          low: semantic.ok,
          textMain: semantic.fg,
          textMuted: semantic.fgMuted,
          textSubtle: semantic.fgSubtle,
        },
        suraksha: {
          obsidian: semantic.canvas,
          slate: semantic.surface,
          elevated: semantic.surface3,
          subsurface: semantic.surface2,
          border: semantic.line,
          cyan: semantic.accent,
          violet: semantic.ai,
          text: semantic.fg,
          muted: semantic.fgMuted,
          critical: semantic.danger,
          high: semantic.high,
          medium: semantic.warn,
          low: semantic.ok,
        },
      },
      fontFamily: {
        sans: ['Geist', 'Noto Sans Devanagari', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        deva: ['Noto Sans Devanagari', 'Geist', 'sans-serif'],
      },
      // Quiet elevation, shadows tinted to the ink canvas. No coloured glows.
      boxShadow: {
        panel: '0 1px 2px 0 rgb(var(--shadow) / 0.10)',
        card: '0 1px 2px 0 rgb(var(--shadow) / 0.10)',
        elevated: '0 10px 30px -12px rgb(var(--shadow) / 0.35)',
        dropdown: '0 16px 40px -12px rgb(var(--shadow) / 0.45)',
        cyanGlow: 'none',
        violetGlow: 'none',
      },
      // Radius rule: inputs and buttons 8px (lg/xl), panels 10-12px (2xl/3xl), status chips full pill.
      borderRadius: { lg: '0.45rem', xl: '0.55rem', '2xl': '0.75rem', '3xl': '1rem' },
    },
  },
  plugins: [],
};

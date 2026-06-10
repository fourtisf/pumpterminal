import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background hierarchy
        bg: {
          DEFAULT: '#0a0b0d',
          elev: '#111316',
          'elev-2': '#16191d',
        },
        border: {
          DEFAULT: '#1f2429',
          bright: '#2d343b',
        },
        text: {
          DEFAULT: '#e8eaed',
          dim: '#8a929c',
          muted: '#4a525c',
        },
        // Accent palette
        green: {
          DEFAULT: '#00ff88',
          dim: '#00cc6a',
        },
        red: { DEFAULT: '#ff3d5a' },
        amber: { DEFAULT: '#ffb547' },
        blue: { DEFAULT: '#4dabff' },
        purple: { DEFAULT: '#b87cff' },
        pink: { DEFAULT: '#ff6bcb' },
      },
      fontFamily: {
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
        display: ['var(--font-display)', 'Orbitron', 'system-ui', 'sans-serif'],
        sans: ['var(--font-space-grotesk)', 'Space Grotesk', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
        'pulse-line': 'pulseLine 2s ease-in-out infinite',
        'ticker-scroll': 'tickerScroll 60s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fresh-glow': 'freshGlow 3s ease-out',
        'live-flash': 'liveFlash 0.6s ease-out',
      },
      keyframes: {
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(0.85)' },
        },
        pulseLine: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        tickerScroll: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        shimmer: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        freshGlow: {
          '0%': {
            borderColor: '#00ff88',
            boxShadow: '0 0 24px rgba(0, 255, 136, 0.2)',
          },
          '100%': {
            borderColor: 'rgba(0, 255, 136, 0.3)',
            boxShadow: 'none',
          },
        },
        liveFlash: {
          '0%': { background: 'rgba(0, 255, 136, 0.15)' },
          '100%': { background: 'transparent' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

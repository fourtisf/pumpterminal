import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background hierarchy — near-black with a green phosphor tint
        bg: {
          DEFAULT: '#050a07',
          elev: '#0a120c',
          'elev-2': '#101a12',
        },
        border: {
          DEFAULT: '#16271c',
          bright: '#27452f',
        },
        text: {
          DEFAULT: '#d8f0dd',
          dim: '#79917f',
          muted: '#48584c',
        },
        // Accent palette — phosphor green primary, terminal amber secondary
        green: {
          DEFAULT: '#00ff66',
          dim: '#00c24e',
        },
        red: { DEFAULT: '#ff4d4d' },
        amber: { DEFAULT: '#ffb000' },
        blue: { DEFAULT: '#36c6ff' },
        purple: { DEFAULT: '#b87cff' },
        pink: { DEFAULT: '#ff6bcb' },
      },
      fontFamily: {
        // One typeface everywhere — hierarchy comes from weight/size/color,
        // like a real trading terminal.
        mono: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
        display: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
        sans: ['var(--font-jetbrains)', 'JetBrains Mono', 'monospace'],
      },
      // Hard 90° corners across the whole app (overrides the default scale);
      // `full` stays round for dots and pills.
      borderRadius: {
        none: '0',
        sm: '0',
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
        full: '9999px',
      },
      animation: {
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
        'pulse-line': 'pulseLine 2s ease-in-out infinite',
        'ticker-scroll': 'tickerScroll 60s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fresh-glow': 'freshGlow 3s ease-out',
        'live-flash': 'liveFlash 0.6s ease-out',
        'blink': 'blink 1.1s steps(1) infinite',
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
            borderColor: '#00ff66',
            boxShadow: '0 0 24px rgba(0, 255, 102, 0.2)',
          },
          '100%': {
            borderColor: 'rgba(0, 255, 102, 0.3)',
            boxShadow: 'none',
          },
        },
        liveFlash: {
          '0%': { background: 'rgba(0, 255, 102, 0.15)' },
          '100%': { background: 'transparent' },
        },
        blink: {
          '0%, 49%': { opacity: '1' },
          '50%, 100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

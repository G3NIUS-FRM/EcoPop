/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Neutral slate scale (used for text, borders, panels)
        ink: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#070B12',
        },
        // Surface — card backgrounds on dark theme
        surface: {
          50:  '#1A2230',
          100: '#141B26',
          200: '#0F1622',
          300: '#0B111C',
          400: '#080D17',
        },
        // PRIMARY — Forest green (EcoPop brand)
        neon: {
          300: '#5BBC9A',
          400: '#2C8C7B',
          500: '#0E4D3A',
          600: '#093A2C',
          700: '#062A20',
        },
        // SECONDARY — Lime green (EcoPop accent)
        plasma: {
          300: '#D4E870',
          400: '#B5D33C',
          500: '#A5CC3F',
          600: '#8FB02F',
          700: '#728F22',
        },
        // TERTIARY — Teal (interlocking ring)
        violet: {
          400: '#4FB8A2',
          500: '#2C8C7B',
          600: '#1F6E62',
          700: '#134741',
        },
        // Warning amber
        warn: {
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
          700: '#a16207',
        },
        // Danger red
        danger: {
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        // Caribbean blue (sea) — daytime + nighttime variants
        sea: {
          100: '#cfe9f5',
          300: '#7cc4e8',
          500: '#3498db',
          700: '#1f6fa5',
          900: '#0f4c82',
        },
        // Night sea — used by MapView when wrapped in dark shell
        seaNight: {
          100: '#0c2438',
          300: '#0e2e48',
          500: '#143d5c',
          700: '#1f4f73',
          900: '#0a1c2e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // Subtle drop shadows instead of neon glows
        'glow-cyan':   '0 4px 14px rgba(14, 77, 58, 0.18)',
        'glow-plasma': '0 4px 14px rgba(165, 204, 63, 0.25)',
        'glow-soft':   '0 2px 10px rgba(44, 140, 123, 0.18)',
        'glow-danger': '0 4px 14px rgba(244, 63, 94, 0.25)',
        'glass': '0 8px 24px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
        'card': '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        'scan': 'scan 6s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.85', transform: 'scale(1.08)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(14,77,58,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(14,77,58,0.04) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

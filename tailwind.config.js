/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './nuxt.config.ts',
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          bg:      '#f4f1ff',
          surface: '#ffffff',
          surface2: '#faf8ff',
          surface3: '#f2efff',
          border:  '#e4dcff',
          glow:    '#7c3aed',
          gold:    '#a16207',
          text:    '#1e1a2e',
          muted:   '#64748b',
          dim:     '#94a3b8',
          accent:  '#7c3aed',
          accent2: '#9333ea',
        },
        mtg: {
          white:     '#f9faf3',
          blue:      '#0e68ab',
          black:     '#150b00',
          red:       '#d3202a',
          green:     '#00733e',
          gold:      '#d4af37',
          colorless: '#b0b2b8',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '4.75% / 3.5%',
        xl2: '1rem',
        xl3: '1.5rem',
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'slide-up':   'slide-up 0.3s ease forwards',
        'fade-in':    'fade-in 0.2s ease forwards',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(124,58,237,0.10), 0 1px 3px rgba(0,0,0,0.04)',
        'glass-lg': '0 24px 64px rgba(124,58,237,0.14), 0 4px 16px rgba(0,0,0,0.06)',
        'accent': '0 4px 16px rgba(124,58,237,0.30)',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
}
